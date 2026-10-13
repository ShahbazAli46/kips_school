<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class StaffStudentReceiving extends Model
{
    use HasFactory;

    protected $table = 'staff_student_receivings';

    protected $fillable = [
        'receipt_no',
        'student_id',
        'staff_id',
        'academic_session_id',
        'amount',
        'description',
        'payment_method',
        'received_date',
        'status',
        'admin_received_by',
        'admin_received_at',
        'admin_notes',
        'fee_payment_id',
        'parent_phone',
        'whatsapp_status',
        'whatsapp_message_id',
        'whatsapp_sent_at',
        'whatsapp_error',
    ];

    protected $casts = [
        'amount'            => 'decimal:2',
        'received_date'     => 'date:Y-m-d',
        'admin_received_at' => 'datetime',
        'whatsapp_sent_at'  => 'datetime',
    ];

    /**
     * Relationship: The student who paid the amount.
     */
    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    /**
     * Relationship: The staff member / teacher who collected the amount.
     */
    public function staff()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    /**
     * Relationship: Super Admin who acknowledged / received the amount from staff.
     */
    public function adminReceiver()
    {
        return $this->belongsTo(User::class, 'admin_received_by');
    }

    /**
     * Relationship: Academic Session.
     */
    public function academicSession()
    {
        return $this->belongsTo(AcademicSession::class, 'academic_session_id');
    }

    /**
     * Relationship: Fee Payment record linked in Daily Receivings.
     */
    public function feePayment()
    {
        return $this->belongsTo(FeePayment::class, 'fee_payment_id');
    }

    /**
     * Scope: Pending handover to Super Admin.
     */
    public function scopePendingHandover($query)
    {
        return $query->where('status', 'pending_handover');
    }

    /**
     * Scope: Received by Super Admin.
     */
    public function scopeReceivedByAdmin($query)
    {
        return $query->where('status', 'received_by_admin');
    }

    /**
     * Scope: Filter by staff member.
     */
    public function scopeForStaff($query, $staffId)
    {
        return $query->where('staff_id', $staffId);
    }

    /**
     * Generate unique sequential receipt number: e.g. SSR-2610-0001
     */
    public static function generateReceiptNo(): string
    {
        $prefix = 'SSR-' . date('ym');
        $last = static::where('receipt_no', 'LIKE', "{$prefix}-%")
            ->orderBy('id', 'desc')
            ->value('receipt_no');

        if ($last) {
            $parts = explode('-', $last);
            $seq = intval(end($parts)) + 1;
        } else {
            $seq = 1;
        }

        return sprintf('%s-%04d', $prefix, $seq);
    }
}
