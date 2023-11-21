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

// Define the structure of a PetRecord
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

// Define the structure of an OwnerData
type OwnerData = Record<{
  id: Principal;
  name: string;
  address: string;
  phoneNumber: string;
}>;

// Define the structure of a PetPayload
type PetPayload = Record<{
  name: string;
  breed: string;
  sex: string;
  dateOfBirth: string;
  imageUrl: string;
}>;

// Define the structure of an OwnerPayload
type OwnerPayload = Record<{
  name: string;
  address: string;
  phoneNumber: string;
}>;

// Define the structure of an UpdateRecordPayload
type UpdateRecordPayload = Record<{
  name: string;
  address: string;
  phoneNumber: string;
}>;

// Define the structure of an AddPetPayload
type AddPetPayload = Record<{
  petPayload: PetPayload;
  ownerPayload: OwnerPayload;
}>;

// Create a storage for pet records
const recordStorage = new StableBTreeMap<string, PetRecord>(0, 44, 2048);

// Create a storage for pending pet transfers
const pendingPets = new StableBTreeMap<string, Principal>(1, 44, 1024);

// Query function to get a pet record by ID
$query;
export function getPetRecord(id: string): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }

    // Retrieve pet record from storage
    const petOpt = recordStorage.get(id);

    // Return result based on the presence of the pet record
    return match(petOpt, {
      Some: (pet) => Result.Ok<PetRecord, string>(pet),
      None: () =>
        Result.Err<PetRecord, string>(`Pet with ID ${id} not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Error retrieving pet: ${error}`);
  }
}

// Update function to add a new pet
$update;
export function addPet(payload: AddPetPayload): Result<PetRecord, string> {
  try {
    // Validate payload
    if (!payload || typeof payload !== "object") {
      return Result.Err<PetRecord, string>("Invalid payload for adding pet");
    }

    // Validate pet payload
    const petPayload = payload.petPayload;
    if (!petPayload || typeof petPayload !== "object") {
      return Result.Err<PetRecord, string>("Invalid pet payload for adding pet");
    }

    // Validate owner payload
    const ownerPayload = payload.ownerPayload;
    if (!ownerPayload || typeof ownerPayload !== "object") {
      return Result.Err<PetRecord, string>("Invalid owner payload for adding pet");
    }

    // Validate owner payload properties
    if (!ownerPayload.name || !ownerPayload.address || !ownerPayload.phoneNumber) {
      return Result.Err<PetRecord, string>("Invalid owner payload properties for adding pet");
    }

    // Set owner information
    const ownerDetail: OwnerData = {
      id: ic.caller(),
      name: ownerPayload.name,
      address: ownerPayload.address,
      phoneNumber: ownerPayload.phoneNumber,
    };

    // Validate pet payload properties
    if (!petPayload.name || !petPayload.breed || !petPayload.sex || !petPayload.dateOfBirth || !petPayload.imageUrl) {
      return Result.Err<PetRecord, string>("Invalid pet payload properties for adding pet");
    }

    // Set pet records
    const pet: PetRecord = {
      id: uuidv4(),
      createdAt: ic.time(),
      updatedAt: Opt.None,
      transferTo: Opt.None,
      ownerDetail,
      name: petPayload.name,
      breed: petPayload.breed,
      sex: petPayload.sex,
      dateOfBirth: petPayload.dateOfBirth,
      imageUrl: petPayload.imageUrl,
    };

    // Add to storage
    recordStorage.insert(pet.id, pet);

    // Return successful result
    return Result.Ok(pet);
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to add pet: ${error}`);
  }
}

// Update function to edit owner information
$update;
export function updateOwnerInformation(
  id: string,
  payload: UpdateRecordPayload
): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }


    // Validate payload properties
    if (!payload.name || !payload.address || !payload.phoneNumber) {
      return Result.Err<PetRecord, string>("Invalid payload properties for updating owner information");
    }

    return match(recordStorage.get(id), {
      Some: (pet) => {
        // Check if caller is the owner
        if (pet.ownerDetail.id.toString() !== ic.caller().toString()) {
          return Result.Err<PetRecord, string>("Only pet owner can edit record");
        }

        // Set each property of the payload individually
        const updatePetRecord: PetRecord = {
          ...pet,
          ownerDetail: { id: pet.ownerDetail.id, name: payload.name, address: payload.address, phoneNumber: payload.phoneNumber },
          updatedAt: Opt.Some(ic.time()),
        };

        // Update pet record in storage
        recordStorage.insert(id, updatePetRecord);

        // Return successful result
        return Result.Ok<PetRecord, string>(updatePetRecord);
      },
      None: () => Result.Err<PetRecord, string>(`Couldn't update pet record with id=${id}. Record not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to update pet record: ${error}`);
  }
}

// Update function to edit pet information
$update;
export function updatePetInformation(
  id: string,
  payload: PetPayload
): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }


    // Validate payload properties
    if (!payload.name || !payload.breed || !payload.sex || !payload.dateOfBirth || !payload.imageUrl) {
      return Result.Err<PetRecord, string>("Invalid payload properties for updating pet information");
    }

    return match(recordStorage.get(id), {
      Some: (pet) => {
        // Check if caller is the owner
        if (pet.ownerDetail.id.toString() !== ic.caller().toString()) {
          return Result.Err<PetRecord, string>("Only pet owner can edit record");
        }

        // Set each property of the payload individually
        const updatePetRecord: PetRecord = {
          ...pet,
          name: payload.name,
          breed: payload.breed,
          sex: payload.sex,
          dateOfBirth: payload.dateOfBirth,
          imageUrl: payload.imageUrl,
          updatedAt: Opt.Some(ic.time()),
        };

        // Update pet record in storage
        recordStorage.insert(id, updatePetRecord);

        // Return successful result
        return Result.Ok<PetRecord, string>(updatePetRecord);
      },
      None: () => Result.Err<PetRecord, string>(`Couldn't update pet record with id=${id}. Record not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to update pet record: ${error}`);
  }
}

// Update function to transfer a pet
$update;
export function transferPet(
  id: string,
  to: Principal
): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }


    return match(recordStorage.get(id), {
      Some: (pet) => {
        // Check if caller is the owner
        if (pet.ownerDetail.id.toString() !== ic.caller().toString()) {
          return Result.Err<PetRecord, string>("Only pet owner can transfer pet record");
        }

        // Set each property of the payload individually
        const updatePetRecord: PetRecord = {
          ...pet,
          transferTo: Opt.Some(to),
          updatedAt: Opt.Some(ic.time()),
        };

        // Update pet record in storage
        recordStorage.insert(id, updatePetRecord);

        // Update pending record
        pendingPets.insert(id, to);

        // Return successful result
        return Result.Ok<PetRecord, string>(updatePetRecord);
      },
      None: () => Result.Err<PetRecord, string>(`Couldn't update pet record with id=${id}. Record not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to transfer pet: ${error}`);
  }
}

// Update function to claim a pet
$update;
export function claimPet(
  id: string,
  payload: UpdateRecordPayload
): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }


    // Validate payload properties
    if (!payload.name || !payload.address || !payload.phoneNumber) {
      return Result.Err<PetRecord, string>("Invalid payload properties for claiming pet");
    }

    return match(recordStorage.get(id), {
      Some: (pet) => {
        return match(pendingPets.get(pet.id), {
          Some: (pendingTo) => {
            if (pendingTo.toString() !== ic.caller().toString()) {
              return Result.Err<PetRecord, string>(`Couldn't claim pet with id=${id}. Pet not assigned to you`);
            }

            // Set each property of the payload individually
            const updatePetRecord: PetRecord = {
              ...pet,
              transferTo: Opt.None,
              ownerDetail: { ...pet.ownerDetail, id: ic.caller(), name: payload.name, address: payload.address, phoneNumber: payload.phoneNumber },
              updatedAt: Opt.Some(ic.time()),
            };

            // Update pet record in storage
            recordStorage.insert(id, updatePetRecord);

            // Remove from pending pets
            pendingPets.remove(id);

            // Return successful result
            return Result.Ok<PetRecord, string>(updatePetRecord);
          },
          None: () => Result.Err<PetRecord, string>(`Couldn't claim pet with id=${id}. Pet not assigned for transfer`),
        });
      },
      None: () => Result.Err<PetRecord, string>(`Couldn't update pet record with id=${id}. Record not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to claim pet: ${error}`);
  }
}

// Update function to delete a pet
$update;
export function deletePet(id: string): Result<PetRecord, string> {
  try {
    // Validate ID
    if (!id || typeof id !== "string") {
      return Result.Err<PetRecord, string>("Invalid pet ID");
    }

    return match(recordStorage.get(id), {
      Some: (pet) => {
        // Check if caller is the owner
        if (pet.ownerDetail.id.toString() !== ic.caller().toString()) {
          return Result.Err<PetRecord, string>("Only pet owner can delete record");
        }

        // Remove pet from storage
        recordStorage.remove(id);

        // Return successful result
        return Result.Ok<PetRecord, string>(pet);
      },
      None: () => Result.Err<PetRecord, string>(`Couldn't delete pet record with id=${id}. Record not found`),
    });
  } catch (error) {
    // Handle unexpected errors
    return Result.Err<PetRecord, string>(`Failed to delete pet record: ${error}`);
  }
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
