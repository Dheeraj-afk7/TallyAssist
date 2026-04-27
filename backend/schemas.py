from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Auth Schemas ---
class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# --- Invoice & Line Item Schemas ---
class LineItemBase(BaseModel):
    description: str
    quantity: int
    unit_price: float
    total: float

class LineItemCreate(LineItemBase):
    pass

class LineItemResponse(LineItemBase):
    id: int
    invoice_id: int
    class Config:
        from_attributes = True

class InvoiceBase(BaseModel):
    vendor_name: Optional[str] = None
    invoice_number: Optional[str] = None
    date: Optional[str] = None
    gstin: Optional[str] = None
    total_amount: Optional[float] = None
    status: str = "Needs Review"
    confidence_score: float = 1.0
    category: Optional[str] = "Uncategorized"

class InvoiceCreate(InvoiceBase):
    line_items: List[LineItemCreate] = []

class InvoiceResponse(InvoiceBase):
    id: int
    user_id: int
    created_at: datetime
    line_items: List[LineItemResponse] = []
    class Config:
        orm_mode = True
