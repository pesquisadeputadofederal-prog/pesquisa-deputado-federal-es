import { desc, eq, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { surveyResets, surveyResponses } from "../../../db/schema";
import { candidates, municipalities } from "../../../lib/survey-options";

const cookieName = "pesquisa_es_voter";
const currentReset = "reset-2026-08-28-01";

function readVoterKey(request: Request) {
  const cookie = request.headers.get("cookie") ?? "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1) ?? "";
}

async function ensureCurrentSurvey() {
  const db = getDb();
  const resetDone = await db
    .select({ key: surveyResets.key })
    .from(surveyResets)
    .where(eq(surveyResets.key, currentReset))
    .limit(1);

  if (resetDone.length === 0) {
    await db.batch([
      db.delete(surveyResponses),
      db.insert(surveyResets).values({ key: currentReset }),
    ]);
  }

  return db;
}

export async function GET(request: Request) {
  try {
    const db = await ensureCurrentSurvey();
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(surveyResponses)
        .orderBy(desc(surveyResponses.id))
        .limit(200),
      db
        .select({
          responseCount: sql<number>`count(*)`,
          municipalityCount: sql<number>`count(distinct ${surveyResponses.municipality})`,
        })
        .from(surveyResponses),
    ]);

    const voterKey = readVoterKey(request);
    const previousVote = voterKey
      ? await db
          .select({ id: surveyResponses.id })
          .from(surveyResponses)
          .where(eq(surveyResponses.voterKey, voterKey))
          .limit(1)
      : [];

    return Response.json({
      responses: rows,
      totalResponses: Number(totals[0]?.responseCount ?? 0),
      municipalityCount: Number(totals[0]?.municipalityCount ?? 0),
      hasVoted: previousVote.length > 0,
    });
  } catch {
    return Response.json({ error: "Não foi possível carregar as respostas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { municipality?: string; candidate?: string };
    const municipality = body.municipality?.trim() ?? "";
    const candidate = body.candidate?.trim() ?? "";

    if (!municipalities.includes(municipality) || !candidates.includes(candidate)) {
      return Response.json({ error: "Município ou candidatura inválida." }, { status: 400 });
    }

    const db = await ensureCurrentSurvey();
    const existingKey = readVoterKey(request);

    if (existingKey) {
      const previousVote = await db
        .select({ id: surveyResponses.id })
        .from(surveyResponses)
        .where(eq(surveyResponses.voterKey, existingKey))
        .limit(1);
      if (previousVote.length > 0) {
        return Response.json({ error: "Este dispositivo já participou da pesquisa." }, { status: 409 });
      }
    }

    const voterKey = existingKey || crypto.randomUUID();
    const surveyDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());

    const [response] = await db
      .insert(surveyResponses)
      .values({ municipality, surveyDate, candidate, voterKey })
      .returning();

    return Response.json(
      { response },
      {
        status: 201,
        headers: {
          "Set-Cookie": `${cookieName}=${voterKey}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed") || message.includes("voter_key")) {
      return Response.json({ error: "Este dispositivo já participou da pesquisa." }, { status: 409 });
    }
    return Response.json({ error: "Não foi possível registrar a resposta." }, { status: 500 });
  }
}
