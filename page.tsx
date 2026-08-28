"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Landmark, MapPin, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { candidates, municipalities } from "@/lib/survey-options";

type Survey = { id: number; municipality: string; candidate: string };

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export default function Home() {
  const [municipality, setMunicipality] = useState("");
  const [candidate, setCandidate] = useState("");
  const [candidateSearch, setCandidateSearch] = useState("");
  const [candidateOpen, setCandidateOpen] = useState(false);
  const [records, setRecords] = useState<Survey[]>([]);
  const [totalResponses, setTotalResponses] = useState(0);
  const [municipalityCount, setMunicipalityCount] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "already-voted" | "error">("idle");

  const loadRecords = async () => {
    try {
      const response = await fetch("/api/responses", { cache: "no-store" });
      if (response.ok) {
        const data = await response.json();
        setRecords(data.responses ?? []);
        setTotalResponses(Number(data.totalResponses ?? data.responses?.length ?? 0));
        setMunicipalityCount(Number(data.municipalityCount ?? 0));
        if (data.hasVoted) { setHasVoted(true); setStatus("already-voted"); }
      }
    } catch { }
  };
  useEffect(() => { void loadRecords(); }, []);
  const filteredCandidates = useMemo(() => {
    const query = normalizeSearch(candidateSearch);
    if (!query) return [];
    const rank = (option: string) => {
      const normalized = normalizeSearch(option);
      if (normalized.startsWith(query)) return 0;
      if (normalized.split(/\s+/).some((word) => word.startsWith(query))) return 1;
      return 2;
    };
    return candidates
      .filter((option) => normalizeSearch(option).includes(query))
      .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, "pt-BR"));
  }, [candidateSearch]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!municipality || !candidates.includes(candidate)) return;
    setStatus("saving");
    try {
      const response = await fetch("/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ municipality, candidate }) });
      if (response.status === 409) { setHasVoted(true); setStatus("already-voted"); return; }
      if (!response.ok) throw new Error("Falha ao salvar");
      setCandidate(""); setCandidateSearch(""); setCandidateOpen(false); setHasVoted(true); setStatus("saved"); await loadRecords();
    } catch { setStatus("error"); }
  }

  return (
    <main className="min-h-screen bg-[#f5f2e9] text-[#132b25]">
      <header className="border-b border-[#183b32]/10 bg-[#123c33] text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-[#f4c54f] text-[#123c33]"><Landmark size={20} /></div><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#f4c54f]">Espírito Santo</p><p className="font-semibold">Intenção de voto 2026</p></div></div>
          <span className="hidden rounded-full border border-[#f4c54f]/50 bg-[#f4c54f]/10 px-4 py-2 text-sm font-bold text-[#f4c54f] sm:block">Deputado Federal</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="mb-8 grid items-end gap-5 md:grid-cols-[1fr_auto]">
          <div><p className="mb-4 inline-flex rounded-full bg-[#d99b22] px-4 py-2 text-sm font-extrabold uppercase tracking-[.14em] text-[#183026]">Pesquisa eleitoral 2026</p><h1 className="max-w-4xl font-serif text-4xl leading-[1.04] font-bold sm:text-6xl"><span className="block text-[#a36d13]">Coleta de intenção de voto</span> para Deputado Federal</h1><p className="mt-4 max-w-2xl text-base leading-7 text-[#536760] sm:text-lg">Informe o seu município e digite o nome do candidato em quem você pretende votar.</p></div>
          <div className="flex gap-3"><div className="metric"><strong>{totalResponses}</strong><span>respostas</span></div><div className="metric"><strong>{municipalityCount}</strong><span>municípios</span></div></div>
        </section>
        <div className="mx-auto max-w-2xl">
          <section className="rounded-[28px] border border-[#183b32]/10 bg-white p-5 shadow-[0_16px_50px_rgba(26,54,45,.08)] sm:p-8">
            <div className="mb-7 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-[#e7efe8] text-[#276c59]"><Vote size={18}/></span><div><h2 className="text-xl font-bold">Nova resposta</h2><p className="text-sm text-[#60716b]">Uma participação por dispositivo.</p></div></div>
            <form onSubmit={submit} className="space-y-6">
              <label className="field"><span><MapPin size={16}/> Município</span><Select value={municipality} onValueChange={setMunicipality} disabled={hasVoted}><SelectTrigger className="h-12 w-full rounded-xl bg-[#fbfaf6] px-4"><SelectValue placeholder="Selecione o município" /></SelectTrigger><SelectContent className="max-h-72">{municipalities.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></label>
              <label className="field"><span><Vote size={16}/> Candidato a Deputado Federal</span><Combobox items={filteredCandidates} value={candidate} inputValue={candidateSearch} open={candidateOpen && candidateSearch.trim().length > 0} onOpenChange={(open) => setCandidateOpen(open && candidateSearch.trim().length > 0)} onInputValueChange={(value) => { setCandidateSearch(value); setCandidate(""); setCandidateOpen(value.trim().length > 0); }} onValueChange={(value) => { setCandidate(value ?? ""); setCandidateSearch(value ?? ""); setCandidateOpen(false); }} disabled={hasVoted}><ComboboxInput placeholder="Digite a primeira letra do candidato" className="h-12 w-full rounded-xl bg-[#fbfaf6] px-2" showTrigger={false} showClear /><ComboboxContent><ComboboxEmpty>Nenhuma candidatura encontrada.</ComboboxEmpty><ComboboxList>{(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}</ComboboxList></ComboboxContent></Combobox><small className="text-xs font-normal text-[#6d7772]">Os nomes que começam com as letras digitadas aparecem primeiro, em ordem alfabética.</small></label>
              <Button type="submit" disabled={hasVoted || !municipality || !candidates.includes(candidate) || status === "saving"} className="h-12 w-full rounded-xl bg-[#d99b22] text-base font-bold text-[#183026] hover:bg-[#c88b16]">{hasVoted ? "Participação registrada" : status === "saving" ? "Salvando…" : "Registrar resposta"}</Button>
              {status === "saved" && <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#237057]"><CheckCircle2 size={17}/> Resposta registrada com sucesso.</p>}
              {status === "already-voted" && <p className="flex items-center justify-center gap-2 text-center text-sm font-semibold text-[#237057]"><CheckCircle2 size={17}/> Este dispositivo já participou da pesquisa.</p>}
              {status === "error" && <p className="text-center text-sm font-semibold text-red-700">Não foi possível registrar. Tente novamente.</p>}
            </form>
          </section>
        </div>
        <p className="mx-auto mt-7 max-w-4xl text-center text-xs leading-5 text-[#6d7772]">É permitida uma participação por navegador ou dispositivo. Não é necessário criar conta ou fazer login.</p>
      </div>
    </main>
  );
}
