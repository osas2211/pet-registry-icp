import {
  $query,
  $update,
  Record,
  StableBTreeMap,
  match,
  Result,
  nat64,
  ic,
  Opt,
  Principal,
} from "azle";
import { v4 as uuidv4 } from "uuid";

type PetRecord = Record<{
  id: string;
  name: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  imageUrl: string;
  createdAt: nat64;
  updatedAt: Opt<nat64>;
  transferTo: Opt<Principal>;
  ownerDetail: OwnerData;
}>;

type OwnerData = Record<{
  id: Principal;
  name: string;
  address: string;
  phoneNumber: string;
}>;

type PetPayload = Record<{
  name: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  imageUrl: string;
}>;

type UpdatePetPayload = Record<{
  name: Opt<string>;
  breed: Opt<string>;
  sex: Opt<string>;
  dateOfBirth: Opt<string>;
  imageUrl: Opt<string>;
}>;

type OwnerPayload = Record<{
  name: string;
  address: string;
  phoneNumber: string;
}>;

type UpdateRecordPayload = Record<{
  name: string;
  address: string;
  phoneNumber: string;
}>;

type AddPetPayload = Record<{
  petPayload: PetPayload;
  ownerPayload: OwnerPayload;
}>;

const recordStorage = new StableBTreeMap<string, PetRecord>(0, 44, 2048);
const pendingPets = new StableBTreeMap<string, Principal>(1, 44, 1024);

$query;
export function getPetRecord(id: string): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => Result.Ok<PetRecord, string>(pet),
    None: () =>
      Result.Err<PetRecord, string>(`pet with registration id=${id} not found`),
  });
}

$update;
export function addPet(payload: AddPetPayload): Result<PetRecord, string> {
  // set owner information
  const ownerDetail: OwnerData = {
    id: ic.caller(),
    ...payload.ownerPayload,
  };

  // set pet records
  const pet: PetRecord = {
    id: uuidv4(),
    createdAt: ic.time(),
    updatedAt: Opt.None,
    transferTo: Opt.None,
    ownerDetail,
    ...payload.petPayload,
  };

  // add to storage
  recordStorage.insert(pet.id, pet);
  return Result.Ok(pet);
}

$update;
export function updateOwnerInformation(
  id: string,
  payload: UpdateRecordPayload
): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => {
      // check if caller is owner
      if (pet.ownerDetail.id !== ic.caller()) {
        return Result.Err<PetRecord, string>("Only pet owner can edit record");
      }
      const updatePetRecord: PetRecord = {
        ...pet,
        ownerDetail: { id: pet.ownerDetail.id, ...payload },
        updatedAt: Opt.Some(ic.time()),
      };
      recordStorage.insert(pet.id, updatePetRecord);
      return Result.Ok<PetRecord, string>(updatePetRecord);
    },
    None: () =>
      Result.Err<PetRecord, string>(
        `couldn't update pet record with id=${id}. record not found`
      ),
  });
}

$update;
export function updatePetInformation(
  id: string,
  payload: PetPayload
): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => {
      // check if caller is owner
      if (pet.ownerDetail.id !== ic.caller()) {
        return Result.Err<PetRecord, string>("Only pet owner can edit record");
      }
      const updatePetRecord: PetRecord = {
        ...pet,
        ...payload,
        updatedAt: Opt.Some(ic.time()),
      };
      recordStorage.insert(pet.id, updatePetRecord);
      return Result.Ok<PetRecord, string>(updatePetRecord);
    },
    None: () =>
      Result.Err<PetRecord, string>(
        `couldn't update pet record with id=${id}. record not found`
      ),
  });
}

$update;
export function transferPet(
  id: string,
  to: Principal
): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => {
      // check if caller is owner
      if (pet.ownerDetail.id !== ic.caller()) {
        return Result.Err<PetRecord, string>(
          "Only pet owner can transfer pet record"
        );
      }
      // set principal who pet is to be transferred to
      const updatePetRecord: PetRecord = {
        ...pet,
        transferTo: Opt.Some(to),
        updatedAt: Opt.Some(ic.time()),
      };

      // update storage
      recordStorage.insert(pet.id, updatePetRecord);

      // update pending record
      pendingPets.insert(pet.id, to);

      return Result.Ok<PetRecord, string>(updatePetRecord);
    },
    None: () =>
      Result.Err<PetRecord, string>(
        `couldn't update pet record with id=${id}. record not found`
      ),
  });
}

$update;
export function claimPet(
  id: string,
  payload: UpdateRecordPayload
): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => {
      // get who the pet is assigned to
      return match(pendingPets.get(pet.id), {
        Some: (pendingTo) => {
          // check if caller is not asssigned to pet
          if (pendingTo != ic.caller()) {
            return Result.Err<PetRecord, string>(
              `couldn't claim pet record with id=${id}. pet not assigned to ypu`
            );
          }
          // update records
          const updatePetRecord: PetRecord = {
            ...pet,
            transferTo: Opt.None,
            ownerDetail: { ...pet.ownerDetail, id: ic.caller(), ...payload },
            updatedAt: Opt.Some(ic.time()),
          };
          recordStorage.insert(pet.id, updatePetRecord);

          // delete pet from pending pets.
          pendingPets.remove(pet.id);
          return Result.Ok<PetRecord, string>(updatePetRecord);
        },
        None: () =>
          Result.Err<PetRecord, string>(
            `couldn't claim pet record with id=${id}. pet not assigned for transfer`
          ),
      });
    },
    None: () =>
      Result.Err<PetRecord, string>(
        `couldn't update pet record with id=${id}. record not found`
      ),
  });
}

$update;
export function deletePet(id: string): Result<PetRecord, string> {
  return match(recordStorage.get(id), {
    Some: (pet) => {
      // check if caller is owner
      if (pet.ownerDetail.id !== ic.caller()) {
        return Result.Err<PetRecord, string>(
          "Only pet owner can delete record"
        );
      }
      // remove record
      recordStorage.remove(id);
      return Result.Ok<PetRecord, string>(pet);
    },
    None: () =>
      Result.Err<PetRecord, string>(
        `couldn't delete pet record with id=${id}. record not found.`
      ),
  });
}

// a workaround to make uuid package work with Azle
globalThis.crypto = {
  //@ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);

    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }

    return array;
  },
};
