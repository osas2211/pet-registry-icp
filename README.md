# PET REGISTER

This canister helps to keep track of pets in a community.

Owning a pet is a big responsibility, as you need to make sure your pet is registered with us, desexed and microchipped. Registration means that we have a record of your pet's name and your contact details, so that we can return them to you if we find them. It also helps keep the community safe.

Register Features:

- Users can add and delete their pet records to the register.
- Users can update pet information on the register.
- Users can update their contact information on the register.
- Users can also transfer their pet information to another user.

## To start the Local Internet Computer

```bash
dfx start --background --clean
```

To create canister

```bash
dfx canister create pet_register
```

To build canister

```bash
dfx build pet_register
```

To install the canister

```bash
dfx canister install pet_register
```

To deploy the canister

```bash
dfx deploy pet_register
```

## Testing

N/B update actions can only be performed by pet owner.

1. Add a new pet to the registry
2. Try to update your contact information
3. Try to update your pets records
4. Try to transfer your pet information to another user
5. User can then proceed to claim the pet using the pet id and their new information.
6. Try to delete pet.
