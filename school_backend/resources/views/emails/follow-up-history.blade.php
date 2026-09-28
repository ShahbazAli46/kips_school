<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Follow-Up History</title>
</head>
<body style="background-color: #faf8ff; color: #131b2e; font-family: 'Inter', Helvetica, Arial, sans-serif; margin: 0; padding: 20px;">
    
    <div style="max-width: 800px; margin: 0 auto; background-color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #dae2fd;">
        
        <!-- Header -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1e3a8a; color: #ffffff; padding: 25px; border-radius: 12px; margin-bottom: 30px;">
            <tr>
                <td width="80" valign="middle">
                    <img src="{{ $logoSrc ?? asset("logo.png") }}" alt="Academy Logo" style="width: 80px; height: 80px; border-radius: 8px; background-color: #ffffff; padding: 4px; display: block;" />
                </td>
                <td valign="middle" style="padding-left: 20px;">
                    <h2 style="margin: 0 0 5px 0; font-size: 24px; text-transform: uppercase;">Kips School Chunian Campus</h2>
                    <p style="margin: 0 0 12px 0; font-size: 14px; opacity: 0.9;">Topper's First Choice</p>
                    <span style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 5px 12px; border-radius: 6px; font-size: 14px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; border: 1px solid rgba(255,255,255,0.3);">Absent Follow up</span>
                </td>
                <td valign="middle" align="right" style="padding-left: 10px;">
                    <span style="display: inline-block; background-color: rgba(255,255,255,0.1); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: bold; letter-spacing: 1px;">📞 0300 39 39 581</span>
                </td>
            </tr>
        </table>

        <!-- Student Details -->
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 15px; border: 1px solid #737686; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <tr>
                <!-- Main Info Box -->
                <td width="70%" valign="top" style="padding: 20px; border-right: 1px solid #737686;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                            <td width="50%" valign="top">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Student Name</p>
                                <p style="margin: 0 0 15px 0; font-size: 18px; color: #004ac6; font-weight: bold;">{{ $student->name }}</p>
                                
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Primary Contact</p>
                                <p style="margin: 0; font-size: 14px;">{{ $student->contact_number ?? 'Not provided' }}</p>
                            </td>
                            <td width="50%" valign="top">
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Registration Number</p>
                                <p style="margin: 0 0 15px 0; font-size: 14px; font-weight: bold;">KIPS-{{ str_pad($student->id, 4, '0', STR_PAD_LEFT) }}</p>
                                
                                <p style="margin: 0 0 5px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Email Address</p>
                                <p style="margin: 0; font-size: 14px;">{{ $student->email ?? 'Not provided' }}</p>
                            </td>
                        </tr>
                    </table>
                </td>
                
                <!-- Status Sidebar Box -->
                <td width="30%" valign="top" style="padding: 20px; background-color: #e2e7ff;">
                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Account Status</p>
                    <div style="margin: 0 0 20px 0; font-size: 14px; font-weight: bold; color: #131b2e;">
                        <span style="display: inline-block; width: 10px; height: 10px; border-radius: 5px; background-color: #22c55e; margin-right: 5px;"></span> Active
                    </div>
                    
                    <p style="margin: 0 0 5px 0; font-size: 12px; color: #434655; text-transform: uppercase; font-weight: bold;">Total Follow-ups</p>
                    <p style="margin: 0; font-size: 28px; font-weight: bold; color: #004ac6;">{{ str_pad(count($history), 2, '0', STR_PAD_LEFT) }}</p>
                </td>
            </tr>
        </table>

        <!-- Timeline -->
        
        @if(count($history) === 0)
            <p style="text-align: center; color: #434655; font-style: italic;">No interaction history recorded for this student.</p>
        @else
            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #737686; border-radius: 8px; overflow: hidden; border-collapse: separate; border-spacing: 0; background-color: #ffffff;">
                <thead>
                    <tr style="background-color: #e2e7ff;">
                        <th style="padding: 12px; border-bottom: 1px solid #737686; font-size: 12px; text-transform: uppercase; color: #131b2e; text-align: center; width: 40px;">Sr.</th>
                        <th style="padding: 12px; border-bottom: 1px solid #737686; font-size: 12px; text-transform: uppercase; color: #131b2e; text-align: left; width: 100px;">Date</th>
                        <th style="padding: 12px; border-bottom: 1px solid #737686; font-size: 12px; text-transform: uppercase; color: #131b2e; text-align: left;">Follow up text</th>
                        <th style="padding: 12px; border-bottom: 1px solid #737686; font-size: 12px; text-transform: uppercase; color: #131b2e; text-align: left; width: 140px;">Follow up by</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($history as $index => $item)
                    <tr>
                        <td style="padding: 16px 12px; border-bottom: 1px solid #dae2fd; font-size: 14px; text-align: center; color: #434655; font-weight: bold; vertical-align: top;">{{ $index + 1 }}</td>
                        <td style="padding: 16px 12px; border-bottom: 1px solid #dae2fd; font-size: 14px; color: #131b2e; font-weight: bold; vertical-align: top;">{{ $item->date }}</td>
                        <td style="padding: 16px 12px; border-bottom: 1px solid #dae2fd; font-size: 14px; color: #131b2e; vertical-align: top; white-space: pre-wrap;">{{ $item->note }}</td>
                        <td style="padding: 16px 12px; border-bottom: 1px solid #dae2fd; font-size: 14px; color: #434655; vertical-align: top;">{{ $item->creator ? $item->creator->name : 'Unknown User' }}</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        @endif

    </div>
</body>
</html>
