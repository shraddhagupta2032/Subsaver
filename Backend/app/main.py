
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import engine, get_db
from app import models, schemas
from app.security import hash_password, verify_password
from app.auth import create_access_token, get_current_user
from app.routers import groups, expenses, subscriptions, reminders, analytics, notifications, settlements, budgets, shared_subscriptions, bill_scanner, subscription_intelligence

app = FastAPI(title="SubSaver API", version="1.0.0")

# Enable CORS for frontend & mobile clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Automatically create database tables
try:
    models.Base.metadata.create_all(bind=engine)
except Exception as e:
    print(f"Warning: Could not initialize database tables on startup: {e}")


# Include Routers
app.include_router(groups.router)
app.include_router(expenses.router, prefix="/expenses")
app.include_router(subscriptions.router, prefix="/subscriptions")
app.include_router(reminders.router, prefix="/reminders")
app.include_router(analytics.router, prefix="/analytics")
app.include_router(notifications.router, prefix="/notifications")
app.include_router(settlements.router, prefix="/groups")
app.include_router(budgets.router, prefix="/budgets")
app.include_router(shared_subscriptions.router)
app.include_router(bill_scanner.router)
app.include_router(subscription_intelligence.router)












@app.get("/")
def root():
    return {"message": "SubSaver Backend is running!"}


@app.get("/db-test")
def db_test():
    try:
        with engine.connect():
            return {"message": "Database connected successfully!"}
    except Exception as e:
        return {"message": "Database connection failed", "error": str(e)}


@app.post("/register", response_model=schemas.UserResponse)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = hash_password(user.password)

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@app.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(user.password, existing_user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        {"sub": str(existing_user.id)}
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer"
    }


@app.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user