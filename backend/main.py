from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta
import models, schemas, auth, database, ai_pipeline

models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="TallyAssist API", description="AI-powered SaaS platform for invoice processing", version="1.0.0")

# Setup CORS for Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development; change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Dependency ---
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Auth Routes ---
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

from typing import List, Optional

# --- Invoice Routes ---
@app.post("/api/invoices/upload", response_model=schemas.InvoiceResponse)
async def upload_invoice(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    # 1. Read File Bytes and Run Real OCR Extraction
    file_bytes = await file.read()
    try:
        extracted_data = ai_pipeline.process_invoice(file_bytes, file.filename)
    except Exception as e:
        if str(e) == "RATE_LIMIT_EXCEEDED":
            raise HTTPException(status_code=429, detail="API Rate Limit Exhausted. Please try again later.")
        raise HTTPException(status_code=500, detail="Extraction failed")
    
    # 2. Determine Status based on Confidence
    status_val = "Valid" if extracted_data["confidence_score"] > 0.8 else "Needs Review"
    
    # 3. Save to DB
    new_invoice = models.Invoice(
        user_id=current_user.id,
        vendor_name=extracted_data["vendor_name"],
        invoice_number=extracted_data["invoice_number"],
        date=extracted_data["date"],
        gstin=extracted_data["gstin"],
        total_amount=extracted_data["total_amount"],
        status=status_val,
        confidence_score=extracted_data["confidence_score"],
        category="Uncategorized"
    )
    db.add(new_invoice)
    db.commit()
    db.refresh(new_invoice)
    
    # Save Line Items
    for item in extracted_data["line_items"]:
        # extracted line items are dicts from pydantic dump
        if isinstance(item, dict):
            new_line_item = models.LineItem(invoice_id=new_invoice.id, **item)
        else:
            new_line_item = models.LineItem(invoice_id=new_invoice.id, **item.dict())
        db.add(new_line_item)
    db.commit()
    db.refresh(new_invoice)
    
    return new_invoice

@app.get("/api/invoices", response_model=List[schemas.InvoiceResponse])
def get_invoices(category: Optional[str] = None, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    query = db.query(models.Invoice).filter(models.Invoice.user_id == current_user.id)
    if category:
        query = query.filter(models.Invoice.category == category)
    invoices = query.order_by(models.Invoice.created_at.desc()).all()
    return invoices

@app.get("/api/invoices/{invoice_id}", response_model=schemas.InvoiceResponse)
def get_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@app.put("/api/invoices/{invoice_id}", response_model=schemas.InvoiceResponse)
def update_invoice(invoice_id: int, invoice_update: schemas.InvoiceCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    db_invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == current_user.id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Update fields
    db_invoice.vendor_name = invoice_update.vendor_name
    db_invoice.invoice_number = invoice_update.invoice_number
    db_invoice.date = invoice_update.date
    db_invoice.gstin = invoice_update.gstin
    db_invoice.total_amount = invoice_update.total_amount
    db_invoice.category = invoice_update.category or "Uncategorized"
    db_invoice.status = "Valid" # Once manually updated, mark as Valid
    
    # Update line items (for simplicity, delete old and recreate)
    db.query(models.LineItem).filter(models.LineItem.invoice_id == invoice_id).delete()
    for item in invoice_update.line_items:
        new_line_item = models.LineItem(invoice_id=invoice_id, **item.dict())
        db.add(new_line_item)
        
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    invoice = db.query(models.Invoice).filter(models.Invoice.id == invoice_id, models.Invoice.user_id == current_user.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}

@app.get("/api/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    invoices = db.query(models.Invoice).filter(models.Invoice.user_id == current_user.id).order_by(models.Invoice.created_at.desc()).all()
    
    total_invoices = len(invoices)
    errors = len([i for i in invoices if i.status == "Needs Review"])
    total_amount = sum([i.total_amount for i in invoices if i.total_amount])
    
    # Calculate categories
    categories = {}
    for inv in invoices:
        cat = inv.category or "Uncategorized"
        if cat not in categories:
            categories[cat] = {"count": 0, "amount": 0.0}
        categories[cat]["count"] += 1
        categories[cat]["amount"] += (inv.total_amount or 0.0)
        
    categories_list = [{"name": k, "count": v["count"], "amount": v["amount"]} for k, v in categories.items()]
    
    return {
        "total_invoices": total_invoices,
        "errors_detected": errors,
        "total_amount": total_amount,
        "recent_uploads": invoices[:5],
        "categories": categories_list
    }

from datetime import datetime, timedelta, timezone

@app.get("/api/categories")
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    categories = db.query(models.Invoice.category).filter(
        models.Invoice.user_id == current_user.id,
        models.Invoice.category != None,
        models.Invoice.category != ""
    ).distinct().all()
    
    cat_list = [c[0] for c in categories]
    return cat_list

@app.get("/api/limits")
def get_limits(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Neon postgres might use UTC for func.now()
    now = datetime.now(timezone.utc)
    one_minute_ago = now - timedelta(minutes=1)
    one_day_ago = now - timedelta(days=1)
    
    minute_count = db.query(models.Invoice).filter(
        models.Invoice.user_id == current_user.id,
        models.Invoice.created_at >= one_minute_ago
    ).count()
    
    daily_count = db.query(models.Invoice).filter(
        models.Invoice.user_id == current_user.id,
        models.Invoice.created_at >= one_day_ago
    ).count()
    
    return {
        "minute_limit": 15,
        "minute_used": minute_count,
        "minute_remaining": max(0, 15 - minute_count),
        "daily_limit": 1500,
        "daily_used": daily_count,
        "daily_remaining": max(0, 1500 - daily_count)
    }
