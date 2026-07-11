import UploadDropzone from "@/components/UploadDropzone";

/**
 * Step 3 — static landing copy/layout.
 * Step 4 — real UploadDropzone swapped in for the static placeholder.
 */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 sm:px-6">
        <div className="flex max-w-2xl flex-col items-center gap-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Syllabus2Cal
          </h1>
          <p className="text-lg font-medium text-gray-800 sm:text-xl">
            Upload a syllabus PDF, get every deadline as a calendar file.{" "}
            <span className="text-blue-600">30 seconds.</span>
          </p>
          <p className="text-sm text-gray-500 sm:text-base">
            Built for college and high school students — stop losing points to
            deadlines you forgot were even on the syllabus.
          </p>
        </div>

        <UploadDropzone />
      </div>

      <footer className="border-t border-gray-100 px-4 py-6 text-center text-xs text-gray-400">
        <p>&copy; {new Date().getFullYear()} Syllabus2Cal. Not affiliated with your school.</p>
      </footer>
    </main>
  );
}
