import Link from "next/link";
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-screen py-12">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">
              StrengthQuest
            </h1>
            <p className="text-xl text-gray-300 mb-2">
              Level up your strength irl
            </p>
            <p className="text-lg text-gray-400 mb-8">
              Runescape-style rpg progression for the big 3 lifts. Make workouts addictive again.
            </p>

            <div className="flex gap-4 justify-center">
              {user ? (
                <Link
                  href="/dashboard"
                  className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Get Started
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-3 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Sign In
                  </Link>
                </>
              )}
            </div>

            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-4xl">
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-2">Push / Pull / Legs</h3>
                <p className="text-gray-400">
                  Three skills to master: Bench, Deadlift, and Squat
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-2">Earn XP & Level Up</h3>
                <p className="text-gray-400">
                  Every workout earns XP. Level up your skills and track PRs.
                </p>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-white mb-2">Tier System</h3>
                <p className="text-gray-400">
                  From Novice to Elite. How high can you climb?
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
