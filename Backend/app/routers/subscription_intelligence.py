from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import subscription_intelligence_service

router = APIRouter(prefix="/subscription-intelligence", tags=["Subscription Intelligence"])


@router.get("/summary", response_model=schemas.SubscriptionIntelligenceSummary, status_code=status.HTTP_200_OK)
def get_subscription_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.get_subscription_summary(db=db, user_id=current_user.id)


@router.get("/categories", response_model=List[schemas.CategorySubscriptionAnalysis], status_code=status.HTTP_200_OK)
def get_category_analysis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.get_category_analysis(db=db, user_id=current_user.id)


@router.get("/top", response_model=List[schemas.TopSubscriptionItem], status_code=status.HTTP_200_OK)
def get_top_subscriptions(
    limit: int = Query(default=5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.get_top_subscriptions(db=db, user_id=current_user.id, limit=limit)


@router.get("/renewals", response_model=List[schemas.RenewalIntelligenceItem], status_code=status.HTTP_200_OK)
def get_upcoming_renewals(
    days: int = Query(default=7, ge=0, le=365),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.get_upcoming_renewals(db=db, user_id=current_user.id, days=days)


@router.get("/overlaps", response_model=List[schemas.CategoryConcentrationItem], status_code=status.HTTP_200_OK)
def get_category_overlaps(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.detect_category_concentration(db=db, user_id=current_user.id)


@router.get("/budget-impact", response_model=List[schemas.BudgetSubscriptionImpactItem], status_code=status.HTTP_200_OK)
def get_budget_impact(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.calculate_budget_impact(db=db, user_id=current_user.id)


@router.get("/insights", response_model=List[schemas.SubscriptionInsightItem], status_code=status.HTTP_200_OK)
def get_subscription_insights(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.generate_subscription_insights(db=db, user_id=current_user.id)


@router.get("/health", response_model=schemas.SubscriptionHealthResponse, status_code=status.HTTP_200_OK)
def get_subscription_health(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return subscription_intelligence_service.calculate_subscription_health(db=db, user_id=current_user.id)
