import React, { useEffect, useState, useRef } from "react";
import {
  AppState,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { type Bootstrap, type Entity } from "@haagv/client";
import {
  client,
  configureAuth,
  getAuth,
  selectMembership,
  updateAuthUser,
  rejectCurrentSession,
  loadBootstrap,
} from "./src/platform";
const labels: Record<string, string> = {
  leadership: "Toernooileiding",
  club: "Clubleiding",
  team: "Teamleiding",
  official: "Scheidsrechter",
  player: "Speler",
  supporter: "Supporter",
  editor: "Redactie",
  photographer: "Fotograaf",
  press: "Pers",
  volunteer: "Vrijwilliger",
  scheduled: "Gepland",
  live: "Bezig",
  finished: "Afgelopen",
  bye: "Vrijloting",
};
export default function App() {
  const contextRevision = useRef(0);
  const authSubscription = useRef<{ unsubscribe(): void } | null>(null);
  const mounted = useRef(true);
  const [data, setData] = useState<Bootstrap | null>(null),
    [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [cooldown, setCooldown] = useState(0);
  async function refresh() {
    const revision = contextRevision.current;
    const b = await loadBootstrap();
    if (!mounted.current || revision !== contextRevision.current) return;
    const auth = configureAuth(b);
    if (auth && !authSubscription.current) {
      authSubscription.current = auth.auth.onAuthStateChange(
        (_event, session) => {
          if (updateAuthUser(session?.user.id ?? null)) {
            contextRevision.current++;
            setData(null);
            setCode("");
          }
          setTimeout(() => {
            if (mounted.current) void action(refresh);
          }, 0);
        },
      ).data.subscription;
    }
    if (revision === contextRevision.current) setData(b);
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      if ((e as { status?: number }).status === 401) {
        contextRevision.current++;
        rejectCurrentSession();
        updateAuthUser(null);
        selectMembership(null);
        setData(null);
        setCode("");
        void getAuth()
          ?.auth.signOut({ scope: "local" })
          .catch(() => {});
      }
      setNotice(e instanceof Error ? e.message : "De actie is niet bevestigd.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    mounted.current = true;
    void action(refresh);
    const lifecycle = AppState.addEventListener("change", (state) => {
      if (state === "active") getAuth()?.auth.startAutoRefresh();
      else getAuth()?.auth.stopAutoRefresh();
    });
    return () => {
      mounted.current = false;
      authSubscription.current?.unsubscribe();
      authSubscription.current = null;
      lifecycle.remove();
      getAuth()?.auth.stopAutoRefresh();
    };
  }, []);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  const button = (label: string, onPress: () => void, disabled = false) => (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy }}
      disabled={disabled || busy}
      style={[styles.button, (disabled || busy) && styles.disabled]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
  function teamName(id: unknown) {
    return (
      (data?.data.teams.find((t) => t.id === id)?.name as string) ||
      "Nog te bepalen"
    );
  }
  function matches() {
    return (data?.data.matches || []).map((match: Entity) => (
      <View key={match.id} style={styles.card}>
        <Text style={styles.cardTitle}>
          {teamName(match.homeTeamId)} – {teamName(match.awayTeamId)}
        </Text>
        <Text>
          {String(match.date || "Datum volgt")} · {String(match.time || "")}
        </Text>
        <Text>{String(match.venue || "Locatie volgt")}</Text>
        <Text style={styles.muted}>
          {labels[String(match.status || "scheduled")] || String(match.status)}
          {match.homeScore !== null && match.homeScore !== undefined
            ? ` · ${match.homeScore} – ${match.awayScore}`
            : ""}
        </Text>
        {data?.user &&
          button(
            data.data.favorites.some((f) => f.entityId === match.id)
              ? "Verwijder favoriet"
              : "Volg wedstrijd",
            () =>
              void action(async () => {
                const revision = contextRevision.current;
                const result = await client.command("favorite.toggle", {
                  entityType: "matches",
                  entityId: match.id,
                });
                if (revision === contextRevision.current)
                  setData(result.bootstrap);
              }),
          )}
      </View>
    ));
  }
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>HAAGLANDEN VOETBAL</Text>
        <Text style={styles.title}>Samen langs de lijn.</Text>
        <Text style={styles.muted}>
          Wedstrijden en je account op hetzelfde platform als het web.
        </Text>
        {busy && (
          <ActivityIndicator accessibilityLabel="Bezig" color="#005bab" />
        )}
        {notice !== "" && (
          <Text accessibilityRole="alert" style={styles.notice}>
            {notice}
          </Text>
        )}
        {!data ? (
          <View style={styles.card}>
            <Text>
              {busy
                ? "Platform laden…"
                : "Er zijn nog geen bevestigde platformgegevens."}
            </Text>
            {button("Opnieuw verbinden", () => void action(refresh))}
          </View>
        ) : (
          <>
            {data.mode === "local" && (
              <Text style={styles.notice}>
                Lokale voorbeeldomgeving. OTP wordt beschikbaar na het koppelen
                van Supabase.
              </Text>
            )}
            {!data.user && data.mode === "supabase" && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Inloggen met e-mailcode</Text>
                <TextInput
                  accessibilityLabel="E-mailadres"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="E-mailadres"
                  style={styles.input}
                />
                {button(
                  cooldown
                    ? `Opnieuw over ${cooldown}s`
                    : sent
                      ? "Nieuwe code aanvragen"
                      : "Code aanvragen",
                  () =>
                    void action(async () => {
                      const { error } = await getAuth()!.auth.signInWithOtp({
                        email: email.trim(),
                        options: { shouldCreateUser: false },
                      });
                      if (error)
                        throw Error(
                          "De code kon niet worden aangevraagd. Controleer je adres of probeer later opnieuw.",
                        );
                      setSent(true);
                      setCooldown(60);
                      setNotice(
                        "Als dit account toegang heeft, ontvang je een inlogcode.",
                      );
                    }),
                  cooldown > 0 || !email.includes("@"),
                )}
                {sent && (
                  <>
                    <TextInput
                      accessibilityLabel="Inlogcode"
                      keyboardType="number-pad"
                      autoComplete="one-time-code"
                      value={code}
                      onChangeText={setCode}
                      maxLength={10}
                      placeholder="Inlogcode"
                      style={styles.input}
                    />
                    {button(
                      "Inloggen",
                      () =>
                        void action(async () => {
                          const { error } = await getAuth()!.auth.verifyOtp({
                            email: email.trim(),
                            token: code.trim(),
                            type: "email",
                          });
                          if (error)
                            throw Error(
                              "De code is ongeldig of verlopen. Vraag een nieuwe code aan.",
                            );
                          setCode("");
                          await refresh();
                        }),
                      !/^\d{6,10}$/.test(code),
                    )}
                  </>
                )}
              </View>
            )}
            {data.user && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Mijn account</Text>
                <Text>{data.user.email || data.user.id}</Text>
                {!data.memberships.length && (
                  <Text style={styles.notice}>
                    Je account heeft nog geen beheerd lidmaatschap. Vraag de
                    organisatie om toegang.
                  </Text>
                )}
                {data.memberships.map((m) => (
                  <View key={m.id}>
                    {button(
                      `${labels[m.role] || m.role}${m.teamId ? " · " + (data.data.teams.find((t) => t.id === m.teamId)?.name || "Team") : m.clubId ? " · " + (data.data.clubs.find((c) => c.id === m.clubId)?.name || "Vereniging") : ""}${data.activeMembership?.id === m.id ? " · actief" : ""}`,
                      () =>
                        void action(async () => {
                          contextRevision.current++;
                          selectMembership(m.id);
                          await refresh();
                        }),
                    )}
                  </View>
                ))}
                {button(
                  "Uitloggen",
                  () =>
                    void action(async () => {
                      const { error } = await getAuth()!.auth.signOut();
                      if (error) throw error;
                      selectMembership(null);
                      setSent(false);
                      await refresh();
                    }),
                )}
              </View>
            )}
            <Text style={styles.sectionTitle}>Wedstrijden</Text>
            {data.data.matches.length ? (
              matches()
            ) : (
              <Text style={styles.muted}>
                Er zijn nog geen wedstrijden gepubliceerd.
              </Text>
            )}
            <Text style={styles.sectionTitle}>Nieuws</Text>
            {data.data.news.map((n) => (
              <View key={n.id} style={styles.card}>
                <Text style={styles.cardTitle}>{String(n.title)}</Text>
                <Text>{String(n.body)}</Text>
              </View>
            ))}
            {!data.data.news.length && (
              <Text style={styles.muted}>
                Er is nog geen nieuws gepubliceerd.
              </Text>
            )}
            {button("Vernieuwen", () => void action(refresh))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f4f7fa" },
  content: {
    padding: 22,
    gap: 12,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  brand: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#005bab",
  },
  title: { fontSize: 32, fontWeight: "800", color: "#112b49", marginBottom: 4 },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#112b49",
    marginTop: 16,
  },
  muted: { color: "#526477", lineHeight: 22 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: "#dce5ed",
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: "#112b49" },
  input: {
    borderWidth: 1,
    borderColor: "#bacbd8",
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
    color: "#112b49",
  },
  button: {
    backgroundColor: "#005bab",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  notice: {
    backgroundColor: "#fff4cf",
    padding: 14,
    borderRadius: 8,
    color: "#644b00",
    lineHeight: 22,
  },
});
