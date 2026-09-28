<!DOCTYPE html>
<html>
<head>
    <title>Salary Slip</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
    <h2>Dear {{ $slip->teacher->name }},</h2>
    
    <p>Please find attached your official Salary Slip for the pay period <strong>{{ $slip->month }}</strong>.</p>
    
    <p><strong>Total Net Pay:</strong> Rs {{ number_format($slip->total_amount, 2) }}</p>

    <p>If you have any questions or require further clarification regarding the details, please contact the academy administration.</p>
    
    <br>
    <p>Best regards,</p>
    <p><strong>Kips School Chunian Campus</strong><br>
    <em>Topper's First Choice</em></p>
</body>
</html>
