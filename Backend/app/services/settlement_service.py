from decimal import Decimal, ROUND_HALF_UP
from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app import models, schemas

TWO_PLACES = Decimal("0.01")


def to_decimal_2(val) -> Decimal:
    if not isinstance(val, Decimal):
        val = Decimal(str(val))
    return val.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def simplify_debts(member_balances: List[schemas.MemberBalance]) -> List[schemas.DebtTransfer]:
    debtors = []
    creditors = []

    for mb in member_balances:
        if mb.net_balance < Decimal("0.00"):
            debtors.append([mb.user_id, mb.user_name, -mb.net_balance])
        elif mb.net_balance > Decimal("0.00"):
            creditors.append([mb.user_id, mb.user_name, mb.net_balance])

    debtors.sort(key=lambda x: x[2], reverse=True)
    creditors.sort(key=lambda x: x[2], reverse=True)

    transfers = []
    d_idx = 0
    c_idx = 0

    while d_idx < len(debtors) and c_idx < len(creditors):
        d_id, d_name, d_amt = debtors[d_idx]
        c_id, c_name, c_amt = creditors[c_idx]

        settle_amt = min(d_amt, c_amt).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)
        if settle_amt > Decimal("0.00"):
            transfers.append(
                schemas.DebtTransfer(
                    from_user_id=d_id,
                    from_user_name=d_name,
                    to_user_id=c_id,
                    to_user_name=c_name,
                    amount=settle_amt
                )
            )

        debtors[d_idx][2] -= settle_amt
        creditors[c_idx][2] -= settle_amt

        if debtors[d_idx][2].quantize(TWO_PLACES) == Decimal("0.00"):
            d_idx += 1
        if creditors[c_idx][2].quantize(TWO_PLACES) == Decimal("0.00"):
            c_idx += 1

    return transfers


def calculate_group_balances(db: Session, group_id: int) -> schemas.GroupBalanceResponse:
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    members = db.query(models.GroupMember).filter(models.GroupMember.group_id == group_id).all()
    expenses = db.query(models.Expense).filter(models.Expense.group_id == group_id).all()
    settlements = db.query(models.Settlement).filter(models.Settlement.group_id == group_id).all()

    total_group_spending = sum(
        (Decimal(str(e.total_amount)) for e in expenses), start=Decimal("0.00")
    )
    total_settlements_completed = sum(
        (Decimal(str(s.amount)) for s in settlements), start=Decimal("0.00")
    )

    member_balances: List[schemas.MemberBalance] = []

    for member in members:
        user = member.user
        if not user:
            continue

        total_paid_for_group = sum(
            (Decimal(str(e.total_amount)) for e in expenses if e.payer_id == user.id), start=Decimal("0.00")
        )

        total_share_owed = sum(
            (Decimal(str(sp.amount_owed)) for e in expenses for sp in e.splits if sp.user_id == user.id), start=Decimal("0.00")
        )

        settlements_sent = sum(
            (Decimal(str(s.amount)) for s in settlements if s.payer_id == user.id), start=Decimal("0.00")
        )

        settlements_received = sum(
            (Decimal(str(s.amount)) for s in settlements if s.payee_id == user.id), start=Decimal("0.00")
        )

        net_settlements = settlements_sent - settlements_received
        net_balance = (total_paid_for_group - total_share_owed + net_settlements).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)

        if net_balance > Decimal("0.00"):
            status_str = "GETS_BACK"
        elif net_balance < Decimal("0.00"):
            status_str = "OWES_MONEY"
        else:
            status_str = "SETTLED"

        member_balances.append(
            schemas.MemberBalance(
                user_id=user.id,
                user_name=user.name,
                user_email=user.email,
                total_paid_for_group=to_decimal_2(total_paid_for_group),
                total_share_owed=to_decimal_2(total_share_owed),
                net_settlements=to_decimal_2(net_settlements),
                net_balance=to_decimal_2(net_balance),
                status=status_str
            )
        )


    # Sort member balances by net_balance descending
    member_balances.sort(key=lambda x: x.net_balance, reverse=True)

    suggested_settlements = simplify_debts(member_balances)

    return schemas.GroupBalanceResponse(
        group_id=group.id,
        group_name=group.name,
        total_group_spending=to_decimal_2(total_group_spending),
        total_settlements_completed=to_decimal_2(total_settlements_completed),
        member_balances=member_balances,
        suggested_settlements=suggested_settlements
    )


def format_settlement_response(settlement: models.Settlement, db: Session) -> schemas.SettlementResponse:
    group = db.query(models.Group).filter(models.Group.id == settlement.group_id).first()
    payer = db.query(models.User).filter(models.User.id == settlement.payer_id).first()
    payee = db.query(models.User).filter(models.User.id == settlement.payee_id).first()

    return schemas.SettlementResponse(
        id=settlement.id,
        group_id=settlement.group_id,
        group_name=group.name if group else "",
        payer_id=settlement.payer_id,
        payer_name=payer.name if payer else "",
        payee_id=settlement.payee_id,
        payee_name=payee.name if payee else "",
        amount=to_decimal_2(Decimal(str(settlement.amount))),
        settlement_date=settlement.settlement_date,
        payment_method=settlement.payment_method,
        notes=settlement.notes,
        created_at=settlement.created_at
    )
