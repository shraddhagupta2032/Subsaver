from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(tags=["Subscriptions"])


@router.post("", response_model=schemas.SubscriptionResponse, status_code=status.HTTP_201_CREATED)
@router.post("/", response_model=schemas.SubscriptionResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
def create_subscription(
    sub_in: schemas.SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_sub = models.Subscription(
        user_id=current_user.id,
        name=sub_in.name,
        amount=sub_in.amount,
        currency=sub_in.currency,
        billing_cycle=sub_in.billing_cycle,
        next_renewal_date=sub_in.next_renewal_date,
        category=sub_in.category,
        status=sub_in.status,
        trial_end_date=sub_in.trial_end_date,
        notes=sub_in.notes
    )
    db.add(new_sub)
    db.commit()
    db.refresh(new_sub)

    return new_sub


@router.get("", response_model=List[schemas.SubscriptionResponse])
@router.get("/", response_model=List[schemas.SubscriptionResponse], include_in_schema=False)
def get_user_subscriptions(
    category: Optional[str] = Query(None, description="Filter by category"),
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, PAUSED, CANCELLED)"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    query = db.query(models.Subscription).filter(
        models.Subscription.user_id == current_user.id
    )

    if category:
        query = query.filter(models.Subscription.category == category)

    if status:
        query = query.filter(models.Subscription.status == status.strip().upper())

    subscriptions = query.order_by(models.Subscription.next_renewal_date.asc()).all()
    return subscriptions


@router.get("/{subscription_id}", response_model=schemas.SubscriptionResponse)
def get_subscription_by_id(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if sub.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this subscription"
        )

    return sub


@router.put("/{subscription_id}", response_model=schemas.SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    sub_in: schemas.SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if sub.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this subscription"
        )

    update_data = sub_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sub, field, value)

    sub.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(sub)

    return sub


@router.delete("/{subscription_id}")
def delete_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )

    if sub.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this subscription"
        )

    db.delete(sub)
    db.commit()

    return {"message": "Subscription deleted successfully"}
