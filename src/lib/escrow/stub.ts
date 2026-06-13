import { randomUUID } from "node:crypto";
import type { PaymentStatus } from "@/lib/db/types";
import type {
  CreateHoldParams,
  EscrowIntent,
  EscrowProvider,
} from "./types";

/**
 * In-memory escrow stub modelling "processor holds funds, releases on our
 * trigger". It mirrors the shape of a real processor (intent ids, status
 * transitions) without touching any real money. The durable record of escrow
 * state is the `payments` table, written by the operations layer; this stub
 * just plays the role of the processor for the current process.
 */
export class StubEscrowProvider implements EscrowProvider {
  readonly name = "stub";
  private readonly intents = new Map<string, EscrowIntent>();

  async createHold(params: CreateHoldParams): Promise<EscrowIntent> {
    const paymentIntentId = `pi_stub_${randomUUID().replace(/-/g, "").slice(0, 24)}`;
    const intent: EscrowIntent = {
      paymentIntentId,
      amountJpy: params.amountJpy,
      // Auth + capture into escrow in one step for the stub.
      status: "held",
    };
    this.intents.set(paymentIntentId, intent);
    this.log("createHold", intent);
    return intent;
  }

  async release(paymentIntentId: string): Promise<EscrowIntent> {
    return this.transition(paymentIntentId, "released");
  }

  async refund(paymentIntentId: string): Promise<EscrowIntent> {
    return this.transition(paymentIntentId, "refunded");
  }

  async getStatus(paymentIntentId: string): Promise<PaymentStatus> {
    return this.intents.get(paymentIntentId)?.status ?? "pending";
  }

  private transition(
    paymentIntentId: string,
    status: PaymentStatus,
  ): EscrowIntent {
    const existing = this.intents.get(paymentIntentId);
    const intent: EscrowIntent = existing
      ? { ...existing, status }
      : { paymentIntentId, amountJpy: 0, status };
    this.intents.set(paymentIntentId, intent);
    this.log(status, intent);
    return intent;
  }

  private log(action: string, intent: EscrowIntent) {
    // Visible trail of escrow movements in dev.
    console.info(
      `[escrow:stub] ${action} ${intent.paymentIntentId} ` +
        `¥${intent.amountJpy} → ${intent.status}`,
    );
  }
}
