import os
import json
from dotenv import load_dotenv
from google import genai
from google.genai import types
from pydantic import BaseModel
from typing import List, Optional

load_dotenv()

# Define the expected JSON structure using Pydantic to enforce Gemini's output
class ExtractedLineItem(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float

class ExtractedInvoice(BaseModel):
    vendor_name: Optional[str]
    invoice_number: Optional[str]
    date: Optional[str]
    gstin: Optional[str]
    total_amount: Optional[float]
    confidence_score: float
    line_items: List[ExtractedLineItem]

def process_invoice(file_bytes: bytes, filename: str) -> dict:
    """
    Main entry point for invoice processing using Google Gemini 2.5 Flash.
    """
    print(f"Starting Gemini OCR extraction for {filename}...")
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key or api_key == "your_gemini_api_key_here":
        print("ERROR: GEMINI_API_KEY is not set or invalid. Returning fallback data.")
        return get_fallback_data()
        
    try:
        # Initialize the client. It will automatically pick up GEMINI_API_KEY from the environment.
        client = genai.Client()
        
        # Determine MIME type based on extension
        lower_filename = filename.lower()
        if lower_filename.endswith('.pdf'):
            mime_type = 'application/pdf'
        elif lower_filename.endswith(('.png', '.jpg', '.jpeg')):
            mime_type = 'image/jpeg' if lower_filename.endswith(('.jpg', '.jpeg')) else 'image/png'
        else:
            mime_type = 'application/pdf' # Fallback
            
        # Prepare the document for Gemini
        document = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
        
        prompt = "Analyze this invoice and extract the requested fields. Ensure you extract the line items accurately including description, quantity, unit price, and total. Also extract the GSTIN if present. Return the confidence_score as a float between 0.0 and 1.0 based on how clear and readable the document is."
        
        print("Sending to Gemini 2.5 Flash...")
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[document, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ExtractedInvoice,
            ),
        )
        
        # The response.text is guaranteed to be a JSON string matching our Pydantic model
        parsed_data = json.loads(response.text)
        print("Gemini Extraction Successful!")
        return parsed_data
        
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini Extraction Failed: {error_msg}")
        if "429" in error_msg or "Quota" in error_msg:
            raise Exception("RATE_LIMIT_EXCEEDED")
        return get_fallback_data()

def get_fallback_data() -> dict:
    return {
        "vendor_name": "Extraction Failed / No API Key",
        "invoice_number": None,
        "date": None,
        "gstin": None,
        "total_amount": 0.0,
        "confidence_score": 0.0,
        "line_items": []
    }
