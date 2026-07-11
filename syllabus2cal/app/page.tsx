import UploadDropzone from "@/components/UploadDropzone";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0B1120] text-white">
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-20 text-center">
        <div className="mb-4 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
          Built by a student, for students
        </div>

        <h1 className="max-w-4xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Turn your syllabus into a calendar
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-white/70 sm:text-xl">
          Upload a syllabus PDF, get every deadline as a calendar file.
          <span className="font-semibold text-white"> 30 seconds.</span>
        </p>

        <p className="mt-3 max-w-xl text-sm text-white/50 sm:text-base">
          Designed for college and high school students who are tired of manually copying exam,
          assignment, quiz, and project dates into their calendar.
        </p>

        <div className="mt-12 w-full max-w-2xl">
          <UploadDropzone />
        </div>

        <div className="mt-10 grid w-full max-w-3xl gap-4 text-left sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Extract deadlines</p>
            <p className="mt-1 text-sm text-white/60">
              Exams, assignments, quizzes, and project due dates.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Review before export</p>
            <p className="mt-1 text-sm text-white/60">
              Edit or remove anything before downloading your calendar.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Import anywhere</p>
            <p className="mt-1 text-sm text-white/60">
              Works with Google Calendar, Apple Calendar, and Outlook.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#0B1120]/80">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-6 py-6 text-center text-sm text-white/50 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Syllabus2Cal</p>
          <p>AI-generated dates should be reviewed before importing into your calendar.</p>
        </div>
      </footer>
    </main>
  );
}