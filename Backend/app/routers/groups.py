from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.auth import get_current_user

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=schemas.GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(
    group_in: schemas.GroupCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group_name = group_in.name.strip()
    if not group_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Group name cannot be empty"
        )

    # Create new group
    new_group = models.Group(
        name=group_name,
        created_by=current_user.id
    )
    db.add(new_group)
    db.flush()

    # Automatically add creator as the first member
    creator_member = models.GroupMember(
        group_id=new_group.id,
        user_id=current_user.id
    )
    db.add(creator_member)
    db.commit()
    db.refresh(new_group)

    return schemas.GroupResponse(
        id=new_group.id,
        name=new_group.name,
        created_by=new_group.created_by,
        created_at=new_group.created_at,
        members_count=1
    )


@router.get("", response_model=List[schemas.GroupResponse])
def get_user_groups(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Retrieve all groups where current_user is a member
    memberships = db.query(models.GroupMember).filter(
        models.GroupMember.user_id == current_user.id
    ).all()

    group_ids = [m.group_id for m in memberships]

    if not group_ids:
        return []

    groups = db.query(models.Group).filter(models.Group.id.in_(group_ids)).all()

    result = []
    for g in groups:
        count = db.query(models.GroupMember).filter(models.GroupMember.group_id == g.id).count()
        result.append(
            schemas.GroupResponse(
                id=g.id,
                name=g.name,
                created_by=g.created_by,
                created_at=g.created_at,
                members_count=count
            )
        )

    return result


@router.get("/{group_id}", response_model=schemas.GroupDetailResponse)
def get_group_details(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Verify current user is a member of this group
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this group"
        )

    # Fetch members with user details
    members = db.query(models.GroupMember, models.User).join(
        models.User, models.GroupMember.user_id == models.User.id
    ).filter(
        models.GroupMember.group_id == group_id
    ).all()

    members_list = [
        schemas.GroupMemberResponse(
            id=member.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            joined_at=member.joined_at
        )
        for member, user in members
    ]

    return schemas.GroupDetailResponse(
        id=group.id,
        name=group.name,
        created_by=group.created_by,
        created_at=group.created_at,
        members=members_list
    )


@router.post("/{group_id}/members", response_model=schemas.GroupMemberResponse, status_code=status.HTTP_201_CREATED)
def add_group_member(
    group_id: int,
    member_in: schemas.AddGroupMember,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Verify current user is a member of the group
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to add members to this group"
        )

    # Resolve target user by email or user_id
    target_user = None
    if member_in.email:
        target_user = db.query(models.User).filter(models.User.email == member_in.email).first()
    elif member_in.user_id:
        target_user = db.query(models.User).filter(models.User.id == member_in.user_id).first()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or email must be provided"
        )

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if target user is already a member
    already_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == target_user.id
    ).first()

    if already_member:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group"
        )

    new_member = models.GroupMember(
        group_id=group.id,
        user_id=target_user.id
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)

    return schemas.GroupMemberResponse(
        id=new_member.id,
        user_id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        joined_at=new_member.joined_at
    )


@router.get("/{group_id}/members", response_model=List[schemas.GroupMemberResponse])
def get_group_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    group = db.query(models.Group).filter(models.Group.id == group_id).first()
    if not group:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Group not found"
        )

    # Verify current user is a member of this group
    is_member = db.query(models.GroupMember).filter(
        models.GroupMember.group_id == group_id,
        models.GroupMember.user_id == current_user.id
    ).first()

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to view members of this group"
        )

    members = db.query(models.GroupMember, models.User).join(
        models.User, models.GroupMember.user_id == models.User.id
    ).filter(
        models.GroupMember.group_id == group_id
    ).all()

    return [
        schemas.GroupMemberResponse(
            id=member.id,
            user_id=user.id,
            name=user.name,
            email=user.email,
            joined_at=member.joined_at
        )
        for member, user in members
    ]
