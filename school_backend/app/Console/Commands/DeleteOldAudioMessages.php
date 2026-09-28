<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DeleteOldAudioMessages extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'messages:cleanup-audio';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deletes audio messages older than 15 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $cutoffDate = \Carbon\Carbon::now()->subDays(15);
        $oldMessages = \App\Models\Message::where('type', 'audio')
            ->where('created_at', '<', $cutoffDate)
            ->get();

        $count = 0;
        foreach ($oldMessages as $message) {
            if ($message->audio_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($message->audio_path);
            }
            $message->delete();
            $count++;
        }

        $this->info("Deleted {$count} old audio messages.");
    }
}
