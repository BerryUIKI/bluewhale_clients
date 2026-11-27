import type {
  AccountDto,
  AccountGroupDto,
  AccountGroupUpdateRequestDto,
  AccountUpdateRequestDto,
  CategoryDto,
  CategoryGroupDto,
  CategoryGroupUpdateRequestDto,
  CategoryUpdateRequestDto,
  CounterpartyDto,
  CounterpartyUpdateRequestDto,
  TagDto,
  TagUpdateRequestDto,
} from "@bluewhale/ipc";

/** Builds a full account update, changing only the archive flag. */
export function accountUpdateRequest(
  account: AccountDto,
  isArchived: boolean,
): AccountUpdateRequestDto {
  return {
    id: account.id,
    name: account.name,
    assetType: account.assetType,
    tagIds: account.tagIds,
    ownerId: account.ownerId ?? null,
    customGroupId: account.customGroupId ?? null,
    note: account.note,
    isHidden: account.isHidden,
    isIncludedInNetWorth: account.isIncludedInNetWorth,
    isArchived,
  };
}

/** Builds a full account-group update, changing only the archive flag. */
export function accountGroupUpdateRequest(
  group: AccountGroupDto,
  isArchived: boolean,
): AccountGroupUpdateRequestDto {
  return { id: group.id, name: group.name, isArchived };
}

/** Builds a full category update, changing only the archive flag. */
export function categoryUpdateRequest(
  category: CategoryDto,
  isArchived: boolean,
): CategoryUpdateRequestDto {
  return {
    id: category.id,
    name: category.name,
    groupId: category.groupId ?? null,
    isArchived,
  };
}

/** Builds a full category-group update, changing only the archive flag. */
export function categoryGroupUpdateRequest(
  group: CategoryGroupDto,
  isArchived: boolean,
): CategoryGroupUpdateRequestDto {
  return { id: group.id, name: group.name, isArchived };
}

/** Builds a full tag update, changing only the archive flag. */
export function tagUpdateRequest(tag: TagDto, isArchived: boolean): TagUpdateRequestDto {
  return {
    id: tag.id,
    name: tag.name,
    colorHex: tag.colorHex,
    description: tag.description ?? null,
    isArchived,
  };
}

/** Builds a full counterparty update, changing only the archive flag. */
export function counterpartyUpdateRequest(
  counterparty: CounterpartyDto,
  isArchived: boolean,
): CounterpartyUpdateRequestDto {
  return {
    id: counterparty.id,
    kind: counterparty.kind,
    name: counterparty.name,
    isArchived,
  };
}
