import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { readConfig } from "../server/config.mjs";

export async function bootstrapLeadership({
  client,
  email,
  confirmEmpty = false,
}) {
  if (confirmEmpty !== true)
    throw Error(
      "Bevestig uitdrukkelijk een lege installatie met --confirm-empty.",
    );
  if (
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw Error("Lever één geldig e-mailadres via stdin.");
  const { data: memberships, error: readError } = await client
    .from("haagv_memberships")
    .select("id")
    .limit(1);
  if (readError)
    throw Error("De lege installatie kon niet veilig worden gecontroleerd.");
  if (memberships.length)
    throw Error(
      "BOOTSTRAP_ALREADY_COMPLETE: er bestaat al een beheerd lidmaatschap.",
    );
  // No email is sent. Supabase OTP must still verify possession of the mailbox.
  const { data, error } = await client.auth.admin.createUser({
    email,
    email_confirm: false,
  });
  if (error || !data.user?.id)
    throw Error(
      "Het beheeraccount kon niet worden voorbereid; controleer het project en eventueel bestaande accounts.",
    );
  const { data: membership, error: commitError } = await client.rpc(
    "haagv_bootstrap_leadership",
    { p_user_id: data.user.id },
  );
  if (commitError)
    throw Error(
      "De eenmalige toekenning is niet uitgevoerd. Controleer de lege installatie; het voorbereide Auth-account kreeg geen bevoegdheden.",
    );
  return { userId: data.user.id, membershipId: membership.id };
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  if (process.argv.includes("--help"))
    console.log(
      "Gebruik: node --env-file=.env scripts/bootstrap-admin.mjs --confirm-empty < privé-emailbestand\nAlleen uitvoeren op het uitdrukkelijk aangewezen, lege Supabase-project. Geen mail wordt verzonden.",
    );
  else
    try {
      const config = readConfig();
      if (config.dataMode !== "supabase")
        throw Error("De bootstrap vereist expliciete Supabase-configuratie.");
      let input = "";
      for await (const chunk of process.stdin) {
        input += chunk.toString();
        if (input.length > 300) throw Error("Lever één e-mailadres via stdin.");
      }
      const email = input.trim();
      const client = createClient(config.supabaseUrl, config.secretKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      const result = await bootstrapLeadership({
        client,
        email,
        confirmEmpty: process.argv.includes("--confirm-empty"),
      });
      console.log(
        "Eenmalige toernooileiding voorbereid. Log daarna in met een Supabase OTP-code. Account-ID: " +
          result.userId,
      );
    } catch (error) {
      console.error(error.message);
      process.exitCode = 1;
    }
}
