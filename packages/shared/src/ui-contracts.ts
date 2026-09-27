import { z } from "zod";
import { AnalysisSchema, AnalysisProvenanceSchema, RunSchema } from "./contracts";

export const RunResultSchema = z.object({
  run: RunSchema,
  notifications: z.array(z.object({
    id: z.string(),
    runId: z.string(),
    orderId: z.string(),
    type: z.string(),
    message: z.string(),
    createdAt: z.string().datetime(),
  })),
  orders: z.array(z.object({
    id: z.string(),
    runId: z.string(),
    customerId: z.string(),
    item: z.string(),
    quantity: z.number().int().positive(),
    status: z.enum(["preparing", "shipped", "cancelled", "delivered"]),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
});

export const AnalysisResponseSchema = z.object({
  status: z.enum(["available", "unavailable"]),
  runId: z.string(),
  reason: z.string().nullable(),
  recording: z.object({
    id: z.string(),
    originalRunId: z.string(),
    provenance: AnalysisProvenanceSchema,
    analysis: AnalysisSchema,
  }).nullable(),
  eventMap: z.array(z.object({ recordedEventId: z.string(), runEventId: z.string() })),
});
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export const SourceExcerptSchema = z.object({
  file: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  sourceRevision: z.string(),
  lines: z.array(z.object({ number: z.number().int().positive(), text: z.string() })),
});
export type SourceExcerpt = z.infer<typeof SourceExcerptSchema>;
