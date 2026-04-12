"use client";

import { apiFetchJson } from "@/lib/api";
import type { ExerciseItem, ExercisePlanDetail } from "@/types/exercise-plan";
import { useAuth } from "@/providers/auth-provider";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function ItemRow({
  item,
  planId,
  token,
  onUpdated,
}: {
  item: ExerciseItem;
  planId: string;
  token: string;
  onUpdated: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [instructions, setInstructions] = useState(item.instructions ?? "");
  const [sets, setSets] = useState(
    item.sets != null ? String(item.sets) : "",
  );
  const [reps, setReps] = useState(
    item.reps != null ? String(item.reps) : "",
  );
  const [sortOrder, setSortOrder] = useState(String(item.sortOrder));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(item.name);
    setInstructions(item.instructions ?? "");
    setSets(item.sets != null ? String(item.sets) : "");
    setReps(item.reps != null ? String(item.reps) : "");
    setSortOrder(String(item.sortOrder));
  }, [item]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const so = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(so) || so < 0) {
      setError("Order must be a non-negative integer");
      return;
    }
    const s = sets.trim();
    const r = reps.trim();
    let setsVal: number | null = null;
    if (s !== "") {
      const n = Number.parseInt(s, 10);
      if (Number.isNaN(n) || n < 0) {
        setError("Sets must be empty or a non-negative integer");
        return;
      }
      setsVal = n;
    }
    let repsVal: number | null = null;
    if (r !== "") {
      const n = Number.parseInt(r, 10);
      if (Number.isNaN(n) || n < 0) {
        setError("Reps must be empty or a non-negative integer");
        return;
      }
      repsVal = n;
    }
    const body: Record<string, unknown> = {
      name: name.trim(),
      instructions: instructions.trim() || null,
      sortOrder: so,
      sets: setsVal,
      reps: repsVal,
    };

    setPending(true);
    try {
      await apiFetchJson<ExerciseItem>(
        `/exercise-plans/${planId}/items/${item.id}`,
        token,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (!window.confirm("Remove this exercise from the plan?")) return;
    setPending(true);
    setError(null);
    try {
      await apiFetchJson(
        `/exercise-plans/${planId}/items/${item.id}`,
        token,
        { method: "DELETE" },
      );
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-2 rounded-md border border-zinc-200 p-3 dark:border-zinc-800"
      onSubmit={onSave}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Name *</label>
          <input
            required
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-medium">Instructions</label>
          <textarea
            rows={2}
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Sets</label>
          <input
            inputMode="numeric"
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Reps</label>
          <input
            inputMode="numeric"
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs font-medium">Order</label>
          <input
            inputMode="numeric"
            className="mt-0.5 w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-600 dark:hover:bg-zinc-800"
        >
          {pending ? "…" : "Save item"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void onDelete()}
          className="rounded border border-red-300 px-3 py-1 text-xs font-medium text-red-700 dark:border-red-900 dark:text-red-400"
        >
          Remove
        </button>
      </div>
    </form>
  );
}

export default function ExercisePlanDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { token, ready } = useAuth();
  const router = useRouter();

  const [plan, setPlan] = useState<ExercisePlanDetail | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);
  const [savePlanPending, setSavePlanPending] = useState(false);
  const [deletePlanPending, setDeletePlanPending] = useState(false);

  const [newName, setNewName] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newSets, setNewSets] = useState("");
  const [newReps, setNewReps] = useState("");
  const [addPending, setAddPending] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token || !id) return;
    setLoading(true);
    setPlanError(null);
    try {
      const p = await apiFetchJson<ExercisePlanDetail>(
        `/exercise-plans/${id}`,
        token,
      );
      setPlan(p);
      setTitle(p.title);
      setNotes(p.notes ?? "");
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Failed to load");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [token, id]);

  useEffect(() => {
    if (!ready || !token) return;
    void load();
  }, [ready, token, load]);

  async function onSavePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !plan) return;
    setSavePlanPending(true);
    setPlanError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        notes: notes.trim() || null,
      };
      const updated = await apiFetchJson<ExercisePlanDetail>(
        `/exercise-plans/${id}`,
        token,
        { method: "PATCH", body: JSON.stringify(body) },
      );
      setPlan(updated);
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavePlanPending(false);
    }
  }

  async function onDeletePlan() {
    if (!token || !plan) return;
    if (!window.confirm("Delete entire plan and all exercises?")) return;
    setDeletePlanPending(true);
    setPlanError(null);
    const pid = plan.patientId;
    try {
      await apiFetchJson(`/exercise-plans/${id}`, token, { method: "DELETE" });
      router.replace(
        pid
          ? `/exercise-plans?patientId=${encodeURIComponent(pid)}`
          : "/exercise-plans",
      );
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletePlanPending(false);
    }
  }

  async function onAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setAddError(null);
    const body: Record<string, unknown> = {
      name: newName.trim(),
    };
    if (newInstructions.trim()) body.instructions = newInstructions.trim();
    const s = newSets.trim();
    const r = newReps.trim();
    if (s !== "") {
      const n = Number.parseInt(s, 10);
      if (Number.isNaN(n) || n < 0) {
        setAddError("Sets must be empty or a valid number");
        return;
      }
      body.sets = n;
    }
    if (r !== "") {
      const n = Number.parseInt(r, 10);
      if (Number.isNaN(n) || n < 0) {
        setAddError("Reps must be empty or a valid number");
        return;
      }
      body.reps = n;
    }

    setAddPending(true);
    try {
      await apiFetchJson(`/exercise-plans/${id}/items`, token, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setNewName("");
      setNewInstructions("");
      setNewSets("");
      setNewReps("");
      await load();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Add failed");
    } finally {
      setAddPending(false);
    }
  }

  if (!ready || !token) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!plan) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{planError}</p>
        <Link href="/exercise-plans" className="text-sm underline">
          ← Exercise plans
        </Link>
      </div>
    );
  }

  const listHref = `/exercise-plans?patientId=${encodeURIComponent(plan.patientId)}`;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href={listHref}
          className="text-sm text-zinc-600 underline dark:text-zinc-400"
        >
          ← Plans for patient
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {plan.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Patient:{" "}
          <Link
            href={`/patients/${plan.patient.id}`}
            className="font-medium underline"
          >
            {plan.patient.lastName}, {plan.patient.firstName}
          </Link>
        </p>
      </div>

      <form className="space-y-3" onSubmit={onSavePlan}>
        <h2 className="text-sm font-semibold">Plan details</h2>
        <div>
          <label className="block text-xs font-medium">Title *</label>
          <input
            required
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium">Notes</label>
          <textarea
            rows={3}
            className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        {planError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {planError}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={savePlanPending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {savePlanPending ? "Saving…" : "Save plan"}
          </button>
          <button
            type="button"
            disabled={deletePlanPending}
            onClick={() => void onDeletePlan()}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 dark:border-red-900 dark:text-red-400"
          >
            {deletePlanPending ? "Deleting…" : "Delete plan"}
          </button>
        </div>
      </form>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Exercises</h2>
        <div className="space-y-3">
          {plan.items.map((it) => (
            <ItemRow
              key={it.id}
              item={it}
              planId={id}
              token={token}
              onUpdated={() => void load()}
            />
          ))}
        </div>

        <form
          className="space-y-2 rounded-md border border-dashed border-zinc-300 p-3 dark:border-zinc-600"
          onSubmit={onAddItem}
        >
          <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Add exercise
          </p>
          <input
            required
            placeholder="Name *"
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <textarea
            placeholder="Instructions"
            rows={2}
            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
            value={newInstructions}
            onChange={(e) => setNewInstructions(e.target.value)}
          />
          <div className="flex gap-2">
            <input
              placeholder="Sets"
              inputMode="numeric"
              className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={newSets}
              onChange={(e) => setNewSets(e.target.value)}
            />
            <input
              placeholder="Reps"
              inputMode="numeric"
              className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-950"
              value={newReps}
              onChange={(e) => setNewReps(e.target.value)}
            />
          </div>
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
          <button
            type="submit"
            disabled={addPending}
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {addPending ? "Adding…" : "Add exercise"}
          </button>
        </form>
      </section>
    </div>
  );
}
