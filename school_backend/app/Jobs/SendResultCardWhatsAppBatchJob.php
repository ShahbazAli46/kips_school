<?php

namespace App\Jobs;

use App\Models\User;
use App\Services\WhatsAppGatewayService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SendResultCardWhatsAppBatchJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $timeout = 7200;

    protected array $studentIds;
    protected int $sessionId;
    protected int $classId;
    protected string $categoryId;
    protected int $startIndex;

    public function __construct(array $studentIds, int $sessionId, int $classId, string $categoryId = "all", int $startIndex = 0)
    {
        $this->studentIds = array_values($studentIds);
        $this->sessionId = $sessionId;
        $this->classId = $classId;
        $this->categoryId = $categoryId;
        $this->startIndex = $startIndex;
    }

    public function handle(WhatsAppGatewayService $whatsAppService): void
    {
        $totalStudents = count($this->studentIds);
        if ($totalStudents === 0 || $this->startIndex >= $totalStudents) {
            return;
        }

        Log::info("[WhatsApp Result Card Job] Starting batch for {$totalStudents} students from index {$this->startIndex}.");

        // Precompute ranks for the class/session/category
        $allScoresQuery = DB::table("test_marks")
            ->join("tests", "test_marks.test_id", "=", "tests.id")
            ->join("users as students", "test_marks.student_id", "=", "students.id")
            ->join("major_subject", function($join) {
                $join->on("students.major_id", "=", "major_subject.major_id")
                     ->on("tests.subject_id", "=", "major_subject.subject_id");
            })
            ->whereNull("students.deleted_at")
            ->where("students.is_active", 1)
            ->where("tests.academic_session_id", $this->sessionId)
            ->where("tests.academy_class_id", $this->classId);
            
        if ($this->categoryId !== "all") {
            if (is_numeric($this->categoryId)) {
                $allScoresQuery->where("tests.test_category_id", $this->categoryId);
            } else {
                $allScoresQuery->whereIn("tests.test_category_id", function($q) {
                    $q->select("id")->from("test_categories")->where("type", $this->categoryId);
                });
            }
        }

        $allScores = $allScoresQuery->select("test_marks.student_id", DB::raw("SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained"))
            ->groupBy("test_marks.student_id")
            ->orderByDesc("total_obtained")
            ->get();
        
        $ranksMap = [];
        $rank = 1;
        $prevScore = -1;
        $actualRank = 1;
        foreach ($allScores as $score) {
            if ($prevScore === -1 || $score->total_obtained == $prevScore) {
                // rank stays same
            } else {
                $rank = $actualRank;
            }
            $ranksMap[$score->student_id] = $rank;
            $prevScore = $score->total_obtained;
            $actualRank++;
        }

        $batchSentCount = 0;
        $maxPerBatch = 100;

        for ($i = $this->startIndex; $i < $totalStudents; $i++) {
            $studentId = $this->studentIds[$i];
            $student = User::with(["academyClass", "section", "major"])->find($studentId);

            if ($student) {
                $phone = $student->contact_number ?: $student->emergency_contact;

                if ($phone) {
                    try {
                        // Query subject breakdown
                        $detailsQuery = DB::table("test_marks")
                            ->join("tests", "test_marks.test_id", "=", "tests.id")
                            ->join("subjects", "tests.subject_id", "=", "subjects.id")
                            ->where("test_marks.student_id", $studentId)
                            ->where("tests.academic_session_id", $this->sessionId)
                            ->where("tests.academy_class_id", $this->classId);
                            
                        if ($student->major_id) {
                            $detailsQuery->whereIn("tests.subject_id", function ($q) use ($student) {
                                $q->select("subject_id")
                                  ->from("major_subject")
                                  ->where("major_id", $student->major_id);
                            });
                        }

                        if ($this->categoryId !== "all") {
                            if (is_numeric($this->categoryId)) {
                                $detailsQuery->where("tests.test_category_id", $this->categoryId);
                            } else {
                                $detailsQuery->whereIn("tests.test_category_id", function($q) {
                                    $q->select("id")->from("test_categories")->where("type", $this->categoryId);
                                });
                            }
                        }

                        $subjectRows = $detailsQuery->select(
                                "subjects.name as subject_name",
                                DB::raw("SUM(IFNULL(test_marks.obtained_marks, 0)) as total_obtained"),
                                DB::raw("SUM(tests.total_marks) as total_max")
                            )
                            ->groupBy("subjects.id", "subjects.name")
                            ->get();

                        if ($subjectRows->isNotEmpty()) {
                            $totalObtained = 0;
                            $totalMax = 0;
                            $subjectBreakdownText = "";

                            foreach ($subjectRows as $sRow) {
                                $sObtained = (float) $sRow->total_obtained;
                                $sMax = (float) $sRow->total_max;
                                $sPct = $sMax > 0 ? round(($sObtained / $sMax) * 100, 1) : 0;
                                $totalObtained += $sObtained;
                                $totalMax += $sMax;
                                
                                $subjectBreakdownText .= "▫️ *{$sRow->subject_name}:* {$sObtained} / {$sMax} ({$sPct}%)\n";
                            }

                            $overallPct = $totalMax > 0 ? round(($totalObtained / $totalMax) * 100, 1) : 0;
                            $studentRank = $ranksMap[$studentId] ?? "N/A";
                            $className = $student->academyClass?->name ?? "N/A";
                            if (!empty($student->section?->name)) {
                                $className .= " - Section " . $student->section->name;
                            }
                            $rollNo = $student->roll_number ? $student->roll_number : ("KIPS-" . str_pad($student->id, 4, "0", STR_PAD_LEFT));

                            $message = "📢 *KIPS SCHOOL CHUNIAN CAMPUS*\n"
                                . "*امتحانی نتیجہ / Official Result Card*\n\n"
                                . "محترم والدین / سرپرست،\n"
                                . "آپ کے بچے کے امتحانی نتائج کی تفصیل درج ذیل ہے:\n\n"
                                . "👤 *طالب علم / Student:* {$student->name}\n"
                                . "🔢 *رول نمبر / Roll No:* {$rollNo}\n"
                                . "📚 *کلاس / Class:* {$className}\n"
                                . "🏆 *کلاس پوزیشن / Rank:* #{$studentRank}\n\n"
                                . "📊 *مضامین کے نمبرات / Subject Breakdown:*\n"
                                . $subjectBreakdownText . "\n"
                                . "━━━━━━━━━━━━━━━━━━━━\n"
                                . "🎯 *کل نمبر / Total:* {$totalObtained} / {$totalMax}\n"
                                . "📈 *مجموعی فیصد / Percentage:* {$overallPct}%\n"
                                . "━━━━━━━━━━━━━━━━━━━━\n\n"
                                . "⚠️ باقاعدہ محنت اور وقت کی پابندی بہترین کامیابی کی ضامن ہے۔ مزید تفصیلات اکیڈمی پورٹل پر دیکھی جا سکتی ہیں۔\n\n"
                                . "📞 *Helpline:* 0300 39 39 581\n"
                                . "🌐 *Portal:* https://usachunian.com";

                            $result = $whatsAppService->sendTextMessage($phone, $message);

                            Log::info("[WhatsApp Result Card Job] Sent to {$student->name} ({$phone}) [Item " . ($i + 1) . "/{$totalStudents}]", [
                                "response" => $result
                            ]);

                            $batchSentCount++;
                        }
                    } catch (\Throwable $e) {
                        Log::error("[WhatsApp Result Card Job Error] Student ID {$studentId}: " . $e->getMessage());
                    }
                }
            }

            $isLastItem = ($i === $totalStudents - 1);

            if ($batchSentCount >= $maxPerBatch && !$isLastItem) {
                $nextIndex = $i + 1;
                Log::info("[WhatsApp Result Card Job] Reached 100 limit. 5-min break before index {$nextIndex}.");
                self::dispatch($this->studentIds, $this->sessionId, $this->classId, $this->categoryId, $nextIndex)->delay(now()->addMinutes(5));
                return;
            }

            if (!$isLastItem) {
                $sleepSeconds = rand(12, 22);
                Log::info("[WhatsApp Result Card Job] Waiting {$sleepSeconds}s before next message...");
                sleep($sleepSeconds);
            }
        }

        Log::info("[WhatsApp Result Card Job] Completed batch processing.");
    }
}
