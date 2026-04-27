from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    invoices = relationship("Invoice", back_populates="owner")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    vendor_name = Column(String, index=True)
    invoice_number = Column(String, index=True)
    date = Column(String)
    gstin = Column(String)
    total_amount = Column(Float)
    status = Column(String, default="Needs Review") # "Needs Review" or "Valid"
    confidence_score = Column(Float, default=1.0)
    category = Column(String, default="Uncategorized")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="invoices")
    line_items = relationship("LineItem", back_populates="invoice", cascade="all, delete-orphan")


class LineItem(Base):
    __tablename__ = "line_items"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    description = Column(String)
    quantity = Column(Integer)
    unit_price = Column(Float)
    total = Column(Float)

    invoice = relationship("Invoice", back_populates="line_items")
