from datetime import date
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user
from app.services import settlement_service

router = APIRouter(tags=["Settlements & Balances"])


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


@router.get("/user/debts", response_model=List[schemas.UserDebtItem])
def get_all_user_debts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Find all groups user belongs to
    memberships = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).all()

    user_debts: List[schemas.UserDebtItem] = []

    for mem in memberships:
        group_id = mem.group_id
        group = mem.group or db.query(models.Group).filter(models.Group.id == group_id).first()
        if not group:
            continue

        bal_resp = settlement_service.calculate_group_balances(db, group_id)
        for transfer in bal_resp.suggested_settlements:
            if transfer.from_user_id == current_user.id:
                # Current user owes money
                user_debts.append(
                    schemas.UserDebtItem(
                        id=f"grp_{group_id}_f{transfer.from_user_id}_t{transfer.to_user_id}",
                        group_id=group_id,
                        group_name=group.name,
                        from_user_id=transfer.from_user_id,
                        from_user_name=transfer.from_user_name,
                        to_user_id=transfer.to_user_id,
                        to_user_name=transfer.to_user_name,
                        amount=transfer.amount,
                        direction="YOU_OWE",
                        other_user_id=transfer.to_user_id,
                        other_user_name=transfer.to_user_name
                    )
                )
            elif transfer.to_user_id == current_user.id:
                # Someone owes money to current user
                user_debts.append(
                    schemas.UserDebtItem(
                        id=f"grp_{group_id}_f{transfer.from_user_id}_t{transfer.to_user_id}",
                        group_id=group_id,
                        group_name=group.name,
                        from_user_id=transfer.from_user_id,
                        from_user_name=transfer.from_user_name,
                        to_user_id=transfer.to_user_id,
                        to_user_name=transfer.to_user_name,
                        amount=transfer.amount,
                        direction="OWED_TO_YOU",
                        other_user_id=transfer.from_user_id,
                        other_user_name=transfer.from_user_name
                    )
                )

    return user_debts


@router.get("/{group_id}/balances", response_model=schemas.GroupBalanceResponse)
def get_group_balances(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)
    return settlement_service.calculate_group_balances(db, group_id)



@router.post("/{group_id}/settlements", response_model=schemas.SettlementResponse, status_code=status.HTTP_201_CREATED)
def record_settlement(
    group_id: int,
    settlement_in: schemas.SettlementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)

    if settlement_in.payee_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot record settlement with yourself"
        )

    payee_membership = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == settlement_in.payee_id
    ).first()

    if not payee_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payee is not a member of this group"
        )

    new_settlement = models.Settlement(
        group_id=group_id,
        payer_id=current_user.id,
        payee_id=settlement_in.payee_id,
        amount=settlement_in.amount,
        settlement_date=settlement_in.settlement_date or date.today(),
        payment_method=settlement_in.payment_method,
        notes=settlement_in.notes
    )

    db.add(new_settlement)
    db.commit()
    db.refresh(new_settlement)

    return settlement_service.format_settlement_response(new_settlement, db)


@router.get("/{group_id}/settlements", response_model=List[schemas.SettlementResponse])
def get_group_settlements(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)

    settlements = db.query(models.Settlement).filter(
        models.Settlement.group_id == group_id
    ).order_by(
        models.Settlement.settlement_date.desc(),
        models.Settlement.created_at.desc()
    ).all()

    return [settlement_service.format_settlement_response(s, db) for s in settlements]


@router.get("/{group_id}/settlements/{settlement_id}", response_model=schemas.SettlementResponse)
def get_settlement_by_id(
    group_id: int,
    settlement_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    verify_group_membership(db, group_id, current_user.id)

    settlement = db.query(models.Settlement).filter(
        models.Settlement.id == settlement_id,
        models.Settlement.group_id == group_id
    ).first()

    if not settlement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Settlement not found"
        )

    return settlement_service.format_settlement_response(settlement, db)
