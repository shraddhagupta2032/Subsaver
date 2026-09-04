from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import shared_subscription_service

router = APIRouter(tags=["Shared Subscriptions"])


def verify_group_membership(db: Session, group_id: int, user_id: int) -> models.Group:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    membership = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == user_id
    ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this group"
        )

    return group


# 1. Create Shared Subscription in Group
@router.post("/groups/{group_id}/shared-subscriptions", response_model=schemas.SharedSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_shared_subscription(
    group_id: int,
    sub_in: schemas.SharedSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)

    # Validate payer is in group
    payer_membership = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == sub_in.payer_id
    ).first()
    if not payer_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payer is not a member of this group"
        )

    # Validate each member in member_user_ids is in group
    group_members = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id
    ).all()
    group_member_ids = {m.user_id for m in group_members}

    for u_id in sub_in.member_user_ids:
        if u_id not in group_member_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Subscription member with ID {u_id} is not a member of this group"
            )

    unique_member_ids = list(dict.fromkeys(sub_in.member_user_ids))
    splits = shared_subscription_service.calculate_shared_sub_splits(
        sub_in.total_amount, unique_member_ids
    )

    new_sub = models.SharedSubscription(
        group_id=group_id,
        created_by=current_user.id,
        payer_id=sub_in.payer_id,
        name=sub_in.name,
        total_amount=sub_in.total_amount,
        currency=sub_in.currency,
        billing_cycle=sub_in.billing_cycle,
        next_renewal_date=sub_in.next_renewal_date,
        category=sub_in.category,
        status="ACTIVE",
        auto_renew_expense=sub_in.auto_renew_expense,
        notes=sub_in.notes
    )

    db.add(new_sub)
    db.flush()

    for u_id, share in splits:
        member_record = models.SharedSubscriptionMember(
            shared_subscription_id=new_sub.id,
            user_id=u_id,
            share_amount=share
        )
        db.add(member_record)

    db.commit()
    db.refresh(new_sub)

    return shared_subscription_service.format_shared_subscription_response(new_sub, db)


# 2. List Shared Subscriptions in Group
@router.get("/groups/{group_id}/shared-subscriptions", response_model=List[schemas.SharedSubscriptionResponse])
def get_group_shared_subscriptions(
    group_id: int,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)

    query = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.group_id == group_id
    )

    if status:
        query = query.filter(models.SharedSubscription.status == status.strip().upper())

    subs = query.order_by(models.SharedSubscription.created_at.desc()).all()
    return [shared_subscription_service.format_shared_subscription_response(s, db) for s in subs]


# 3. Get Single Shared Subscription
@router.get("/shared-subscriptions/{subscription_id}", response_model=schemas.SharedSubscriptionResponse)
def get_shared_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.id == subscription_id
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared subscription not found"
        )

    verify_group_membership(db, sub.group_id, current_user.id)
    return shared_subscription_service.format_shared_subscription_response(sub, db)


# 4. Update Shared Subscription
@router.put("/shared-subscriptions/{subscription_id}", response_model=schemas.SharedSubscriptionResponse)
def update_shared_subscription(
    subscription_id: int,
    sub_update: schemas.SharedSubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.id == subscription_id
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared subscription not found"
        )

    verify_group_membership(db, sub.group_id, current_user.id)

    # Permission: Only creator or payer can edit
    if current_user.id not in (sub.created_by, sub.payer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to modify this shared subscription"
        )

    if sub_update.payer_id is not None:
        payer_membership = db.query(models.GroupMember).filter(
            models.GroupMember.group_id == sub.group_id,
            models.GroupMember.user_id == sub_update.payer_id
        ).first()
        if not payer_membership:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payer is not a member of this group"
            )
        sub.payer_id = sub_update.payer_id

    if sub_update.name is not None:
        sub.name = sub_update.name
    if sub_update.currency is not None:
        sub.currency = sub_update.currency
    if sub_update.billing_cycle is not None:
        sub.billing_cycle = sub_update.billing_cycle
    if sub_update.next_renewal_date is not None:
        sub.next_renewal_date = sub_update.next_renewal_date
    if sub_update.category is not None:
        sub.category = sub_update.category
    if sub_update.status is not None:
        sub.status = sub_update.status
    if sub_update.auto_renew_expense is not None:
        sub.auto_renew_expense = sub_update.auto_renew_expense
    if sub_update.notes is not None:
        sub.notes = sub_update.notes

    # If amount or members changed, recalculate splits
    if sub_update.total_amount is not None or sub_update.member_user_ids is not None:
        new_amount = sub_update.total_amount if sub_update.total_amount is not None else sub.total_amount

        if sub_update.member_user_ids is not None:
            group_members = db.query(models.GroupMember).filter(
                models.GroupMember.group_id == sub.group_id
            ).all()
            group_member_ids = {m.user_id for m in group_members}

            for u_id in sub_update.member_user_ids:
                if u_id not in group_member_ids:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Subscription member with ID {u_id} is not a member of this group"
                    )
            target_member_ids = list(dict.fromkeys(sub_update.member_user_ids))
        else:
            target_member_ids = [m.user_id for m in sub.members]

        sub.total_amount = new_amount

        # Delete existing members and replace with newly calculated splits
        db.query(models.SharedSubscriptionMember).filter(
            models.SharedSubscriptionMember.shared_subscription_id == sub.id
        ).delete()
        db.flush()

        new_splits = shared_subscription_service.calculate_shared_sub_splits(
            new_amount, target_member_ids
        )
        for u_id, share in new_splits:
            member_record = models.SharedSubscriptionMember(
                shared_subscription_id=sub.id,
                user_id=u_id,
                share_amount=share
            )
            db.add(member_record)

    db.commit()
    db.refresh(sub)

    return shared_subscription_service.format_shared_subscription_response(sub, db)


# 5. Renew Shared Subscription
@router.post("/shared-subscriptions/{subscription_id}/renew", response_model=schemas.SharedSubscriptionRenewalResult)
def renew_shared_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.id == subscription_id
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared subscription not found"
        )

    verify_group_membership(db, sub.group_id, current_user.id)
    return shared_subscription_service.process_shared_subscription_renewal(db, sub)


# 6. Delete Shared Subscription
@router.delete("/shared-subscriptions/{subscription_id}", status_code=status.HTTP_200_OK)
def delete_shared_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    sub = db.query(models.SharedSubscription).filter(
        models.SharedSubscription.id == subscription_id
    ).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared subscription not found"
        )

    verify_group_membership(db, sub.group_id, current_user.id)

    # Only creator or payer can delete
    if current_user.id not in (sub.created_by, sub.payer_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete this shared subscription"
        )

    db.delete(sub)
    db.commit()

    return {"detail": "Shared subscription deleted successfully"}
