/**
 * useActionState initial states + their types for the account forms.
 *
 * These live OUTSIDE `actions.ts` on purpose: a `"use server"` file may only
 * export async functions, so exporting these plain objects from there throws
 * "A 'use server' file can only export async functions, found object" at runtime.
 */
export interface UpdateProfileState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export interface NotificationPrefsState {
  status: "idle" | "success" | "error";
  message?: string;
}

export interface AddressFormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
}

export const updateProfileInitialState: UpdateProfileState = { status: "idle" };
export const notificationPrefsInitialState: NotificationPrefsState = {
  status: "idle",
};
export const addressInitialState: AddressFormState = { status: "idle" };
