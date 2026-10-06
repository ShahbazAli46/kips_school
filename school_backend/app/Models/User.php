<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Permission\Traits\HasRoles;

#[Fillable(['name', 'email', 'password', 'role_id'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, HasRoles;

    protected $fillable = [
        'uuid',
        'name',
        'email',
        'password',
        'role_id',
        'father_name',
        'gender',
        'contact_number',
        'class_id',
        'major_id',
        'image',
        'is_active',
        'qualification',
        'emergency_contact',
        'teaching_exp_year',
        'monthly_fee',
        'pending_amount',
        'total_paid',
        'section_id',
        'monthly_salary',
        'academic_session_id',
        'roll_number',
        'joining_date',
        'last_seen_at',

        // School Admission Fields
        'student_cnic',
        'erp_reg',
        'dob',
        'father_cnic',
        'father_cell',
        'current_address',
        'remarks',
        'stream_type',
        'test_marks',
        'obtained_marks',
        'admission_month',
        'is_prospectus_sold',
        'is_marks_based_discount',
        'is_discretionary_discount',
        'is_policy_discount',
        'selected_months_tf',
        'tuition_fee_per_policy',
        'discretionary_discount_reason',
        'discretionary_discount_amount',
        'policy_discount_type',
        'policy_discount_amount',
        'total_admission_payable',
        'amount_received_at_admission',
        'admission_balance',
    ];

    protected static function booted()
    {
        static::creating(function ($user) {
            if (empty($user->uuid)) {
                $user->uuid = (string) \Illuminate\Support\Str::uuid();
            }
        });
    }

    public function academicSession()
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    public function academyClass()
    {
        return $this->belongsTo(AcademyClass::class, 'class_id');
    }

    public function role()
    {
        return $this->belongsTo(Role::class);
    }

    public function major()
    {
        return $this->belongsTo(Major::class, 'major_id');
    }

    public function section()
    {
        return $this->belongsTo(Section::class, 'section_id');
    }

    public function teacherAssignments()
    {
        return $this->hasMany(TeacherAssignment::class, 'teacher_id');
    }

    public function enrollments()
    {
        return $this->hasMany(StudentSubjectEnrollment::class, 'student_id');
    }

    public function sessionEnrollments()
    {
        return $this->hasMany(StudentSessionEnrollment::class, 'student_id');
    }

    public function currentSessionEnrollment()
    {
        $activeSession = AcademicSession::getActiveSession();
        if (!$activeSession) return null;

        return $this->sessionEnrollments()->where('academic_session_id', $activeSession->id)->first();
    }

    public function feePayments()
    {
        return $this->hasMany(\App\Models\FeePayment::class, 'student_id');
    }

    public function feeItems()
    {
        return $this->hasMany(StudentFeeItem::class, 'student_id');
    }

    public function feePaymentItems()
    {
        return $this->hasManyThrough(FeePaymentItem::class, FeePayment::class, 'student_id', 'fee_payment_id');
    }

    public function feeFollowUps()
    {
        return $this->hasMany(\App\Models\FeeFollowUp::class, 'student_id');
    }

    public function latestFeeFollowUp()
    {
        return $this->hasOne(\App\Models\FeeFollowUp::class, 'student_id')->latestOfMany();
    }

    public function sentMessages()
    {
        return $this->hasMany(Message::class, 'sender_id');
    }

    public function receivedMessages()
    {
        return $this->hasMany(Message::class, 'receiver_id');
    }

    public function fcmTokens()
    {
        return $this->hasMany(FcmToken::class, 'user_id');
    }

    public function locationPings()
    {
        return $this->hasMany(TeacherLocationPing::class, 'teacher_id');
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'dob' => 'date',
            'monthly_fee' => 'decimal:2',
            'pending_amount' => 'decimal:2',
            'monthly_salary' => 'decimal:2',
            'test_marks' => 'decimal:2',
            'obtained_marks' => 'decimal:2',
            'tuition_fee_per_policy' => 'decimal:2',
            'discretionary_discount_amount' => 'decimal:2',
            'policy_discount_amount' => 'decimal:2',
            'total_admission_payable' => 'decimal:2',
            'amount_received_at_admission' => 'decimal:2',
            'admission_balance' => 'decimal:2',
            'is_prospectus_sold' => 'boolean',
            'is_marks_based_discount' => 'boolean',
            'is_discretionary_discount' => 'boolean',
            'is_policy_discount' => 'boolean',
            'last_seen_at' => 'datetime',
        ];
    }

    /**
     * Get the effective admission/enrollment start date (Carbon start of month).
     */
    public function getEffectiveEnrollmentStart(?\Carbon\Carbon $sessionStart = null): \Carbon\Carbon
    {
        if (!empty($this->admission_month)) {
            try {
                $monthStr = strlen($this->admission_month) === 7 ? $this->admission_month . '-01' : $this->admission_month;
                return \Carbon\Carbon::parse($monthStr)->startOfMonth();
            } catch (\Throwable $e) {
                // fallback
            }
        }

        $created = $this->created_at ? \Carbon\Carbon::parse($this->created_at)->startOfMonth() : now()->startOfMonth();
        if ($sessionStart && $sessionStart->gt($created)) {
            return $sessionStart->copy()->startOfMonth();
        }
        return $created;
    }
}
