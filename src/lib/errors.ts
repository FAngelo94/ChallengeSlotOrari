import { NextResponse } from "next/server";

export type ErrorCode =
  | "INVALID_DATE"
  | "VALIDATION_ERROR"
  | "SLOT_ALREADY_BOOKED"
  | "SLOT_LOCKED"
  | "NOT_FOUND";

export class DomainError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    fields?: Record<string, string>
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }

  toBody() {
    return {
      error: this.code,
      message: this.message,
      ...(this.fields ? { fields: this.fields } : {}),
    };
  }
}

export function invalidDate(message = "Il parametro date è obbligatorio e deve essere in formato YYYY-MM-DD") {
  return new DomainError(400, "INVALID_DATE", message);
}

export function validationError(message: string, fields?: Record<string, string>) {
  return new DomainError(422, "VALIDATION_ERROR", message, fields);
}

export function slotAlreadyBooked() {
  return new DomainError(
    409,
    "SLOT_ALREADY_BOOKED",
    "Questo slot è già stato prenotato da un altro utente"
  );
}

export function slotLocked() {
  return new DomainError(
    409,
    "SLOT_LOCKED",
    "Un altro utente sta completando la prenotazione di questo slot"
  );
}

export function notFound(message = "Risorsa non trovata") {
  return new DomainError(404, "NOT_FOUND", message);
}

/** Prisma unique constraint violation error code. */
export const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_CODE
  );
}

/** Uniform error -> HTTP response mapping for every Route Handler. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof DomainError) {
    return NextResponse.json(error.toBody(), { status: error.status });
  }
  console.error(error);
  return NextResponse.json(
    { error: "INTERNAL_ERROR", message: "Errore interno del server" },
    { status: 500 }
  );
}
