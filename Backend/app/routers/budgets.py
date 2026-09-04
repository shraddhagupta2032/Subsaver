from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import budget_service

router = APIRouter(tags=["Budgets"])


@router.get("/", response_model=List[schemas.BudgetStatusResponse])
def get_budgets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    user_budgets = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id
    ).order_by(models.Budget.created_at.desc()).all()

    return [budget_service.compute_budget_status(b, db) for b in user_budgets]


@router.get("/overview", response_model=schemas.BudgetOverviewResponse)
def get_budget_overview(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return budget_service.get_user_budget_overview(db, current_user.id)


@router.post("/", response_model=schemas.BudgetResponse, status_code=status.HTTP_201_CREATED)
def create_budget(
    budget_in: schemas.BudgetCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    category_clean = budget_in.category.strip()

    # Duplicate check
    existing = db.query(models.Budget).filter(
        models.Budget.user_id == current_user.id,
        models.Budget.category.ilike(category_clean),
        models.Budget.month == budget_in.month,
        models.Budget.year == budget_in.year
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A budget for this category and period already exists"
        )

    new_budget = models.Budget(
        user_id=current_user.id,
        category=category_clean,
        monthly_limit=budget_in.monthly_limit,
        alert_threshold_percentage=budget_in.alert_threshold_percentage,
        month=budget_in.month,
        year=budget_in.year
    )

    db.add(new_budget)
    db.commit()
    db.refresh(new_budget)

    return new_budget


@router.get("/{budget_id}", response_model=schemas.BudgetStatusResponse)
def get_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    if budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this budget"
        )

    return budget_service.compute_budget_status(budget, db)


@router.put("/{budget_id}", response_model=schemas.BudgetResponse)
def update_budget(
    budget_id: int,
    budget_update: schemas.BudgetUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    if budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this budget"
        )

    if budget_update.category is not None:
        budget.category = budget_update.category.strip()
    if budget_update.monthly_limit is not None:
        budget.monthly_limit = budget_update.monthly_limit
    if budget_update.alert_threshold_percentage is not None:
        budget.alert_threshold_percentage = budget_update.alert_threshold_percentage

    db.commit()
    db.refresh(budget)

    return budget



@router.delete("/{budget_id}", status_code=status.HTTP_200_OK)
def delete_budget(
    budget_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    budget = db.query(models.Budget).filter(models.Budget.id == budget_id).first()
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Budget not found"
        )

    if budget.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this budget"
        )

    db.delete(budget)
    db.commit()

    return {"detail": "Budget deleted successfully"}
