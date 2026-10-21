import { AppShell } from "@/components/AppShell";
import { ExamPapersClient } from "@/components/ExamPapersClient";
import {
  examSourceInfo,
  getExamStore,
  persistenceMode,
} from "@/lib/exam-store";

export const dynamic = "force-dynamic";

export default async function ExamPapersPage() {
  const store = await getExamStore();
  const persistence = persistenceMode();
  const source = examSourceInfo();

  return (
    <AppShell current="/exam-papers">
      <ExamPapersClient
        initialStore={store}
        persistence={persistence}
        sourceLabel={store.sourceLabel ?? source.label}
      />
    </AppShell>
  );
}
