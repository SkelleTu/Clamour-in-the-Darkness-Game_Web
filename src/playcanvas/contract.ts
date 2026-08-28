export type AddressEntry = {
  displayName: string;
  lat: number;
  lon: number;
};

export type LoginPayload = {
  username: string;
  password: string;
};

export type RegisterPayload = LoginPayload & {
  confirmPassword: string;
};

export type AuthResult =
  | { status: 'ok'; session: AuthSession }
  | { status: 'error'; message: string };

export type AddressLookupResult =
  | { status: 'ok'; address: string; lat: number; lon: number }
  | { status: 'error'; message: string };
