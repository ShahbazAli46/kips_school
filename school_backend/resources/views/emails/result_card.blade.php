<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Student Result Card</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f7f6e8;">

    <!-- Wrapper -->
    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 800px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e5e7eb;">
        <tr>
            <td style="padding: 30px;">
                
                <!-- Institutional Header -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #1e3a8a; color: #ffffff; border-radius: 12px; margin-bottom: 30px;">
                    <tr>
                        <td width="100" style="padding: 24px; text-align: center;">
                            <img src="{{ $logoSrc ?? asset("logo.png") }}" alt="Logo" width="90" style="background: white; border-radius: 8px; padding: 4px;">
                        </td>
                        <td style="text-align: center; padding: 24px 0;">
                            <h2 style="margin: 0; font-size: 24px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">Kips School Chunian Campus</h2>
                            <p style="margin: 5px 0 0; font-size: 14px; font-weight: bold; opacity: 0.9;">Topper's First Choice</p>
                            <p style="margin: 5px 0 0; font-size: 12px; font-weight: normal; opacity: 0.8;">Opposite Shell Pump Changa Manga Road, Chunian, 0300 39 39 581</p>
                            <div style="margin-top: 15px;">
                                <span style="display: inline-block; background-color: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.3); font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">Student Report Card</span>
                            </div>
                        </td>
                        <td width="100" style="padding: 24px; text-align: center;">
                            <div style="width: 90px; height: 90px; background-color: #ffffff; border-radius: 8px; overflow: hidden; display: inline-block; text-align: center; line-height: 90px; font-size: 40px; font-weight: bold; color: #1e3a8a;">
                                @if(isset($student->student_image) && $student->student_image)
                                    <img src="{{ url('storage/' . $student->student_image) }}" alt="Student" width="90" height="90" style="object-fit: cover;">
                                @else
                                    {{ strtoupper(substr($student->student_name, 0, 1)) }}
                                @endif
                            </div>
                        </td>
                    </tr>
                </table>

                <!-- Top Info Grid -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px; font-size: 14px; text-transform: uppercase;">
                    <tr>
                        <td width="50%" style="border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">Name:</span>
                            <span style="color: #000000; font-weight: 900;">{{ $student->student_name }}</span>
                        </td>
                        <td width="50%" style="border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">School Year:</span>
                            <span style="color: #000000; font-weight: 900;">2025-2026</span>
                        </td>
                    </tr>
                    <tr>
                        <td width="50%" style="border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">Reg. No:</span>
                            <span style="color: #000000; font-weight: 900;">KIPS-{{ str_pad($student->student_id, 4, '0', STR_PAD_LEFT) }}</span>
                        </td>
                        <td width="50%" style="border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">Class & Sec:</span>
                            <span style="color: #000000; font-weight: 900;">{{ trim(($student->class_name ?? '') . ' ' . ($student->section_name ?? '')) ?: 'N/A' }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td width="50%" style="border-right: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">Rank:</span>
                            <span style="color: #000000; font-weight: 900;">#{{ $student->rank }}</span>
                        </td>
                        <td width="50%" style="padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 120px;">Major:</span>
                            <span style="color: #000000; font-weight: 900;">{{ $student->major_name ?? 'N/A' }}</span>
                        </td>
                    </tr>
                </table>

                <!-- Grades Table -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 30px; font-size: 14px; text-align: center; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #333a45; color: #ffffff; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                            <th style="padding: 16px; width: 40%;">Subject</th>
                            <th style="padding: 16px; background-color: #8b939f; width: 20%;">Tests Taken</th>
                            <th style="padding: 16px; background-color: #8b939f; width: 20%;">Marks</th>
                            <th style="padding: 16px; width: 20%;">Percentage</th>
                        </tr>
                    </thead>
                    <tbody style="color: #333333; font-weight: bold;">
                        @foreach($details as $d)
                            @php
                                $perc = $d->percentage;
                                $color = $perc >= 80 ? '#629755' : ($perc >= 60 ? '#d19a2e' : '#c25953');
                            @endphp
                            <tr>
                                <td style="padding: 16px; text-transform: capitalize; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; color: #000000;">{{ $d->subject_name }}</td>
                                <td style="padding: 16px; color: #8b939f; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">{{ $d->tests_taken }}</td>
                                <td style="padding: 16px; color: #8b939f; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">{{ $d->total_obtained }} <span style="font-size: 12px;">/ {{ $d->total_max }}</span></td>
                                <td style="padding: 16px; color: {{ $color }}; border-bottom: 1px solid #e5e7eb;">{{ $perc }}%</td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>

                <!-- Bottom Info Grid -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px; font-size: 14px; text-transform: uppercase;">
                    <tr>
                        <td width="50%" style="border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 160px;">Total Score:</span>
                            <span style="color: #000000; font-weight: 900;">{{ $student->total_obtained }} <span style="font-size: 12px;">/ {{ $student->total_max }}</span></span>
                        </td>
                        <td width="50%" style="border-bottom: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 160px;">Overall Percentage:</span>
                            <span style="color: #000000; font-weight: 900;">{{ $student->percentage }}%</span>
                        </td>
                    </tr>
                    <tr>
                        <td width="50%" style="border-right: 1px solid #e5e7eb; padding: 16px;">
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 160px;">Tests Evaluated:</span>
                            <span style="color: #000000; font-weight: 900;">{{ $student->tests_taken }}</span>
                        </td>
                        <td width="50%" style="padding: 16px;">
                            @php
                                $finalPerc = $student->percentage;
                                $finalColor = $finalPerc >= 80 ? '#629755' : ($finalPerc >= 60 ? '#d19a2e' : '#c25953');
                                $finalGrade = $finalPerc >= 90 ? 'A+' : ($finalPerc >= 80 ? 'A' : ($finalPerc >= 70 ? 'B' : ($finalPerc >= 60 ? 'C' : 'F')));
                            @endphp
                            <span style="color: #555555; font-weight: bold; display: inline-block; width: 160px;">Final Grade:</span>
                            <span style="color: {{ $finalColor }}; font-weight: 900;">{{ $finalGrade }}</span>
                        </td>
                    </tr>
                </table>

                <!-- Remarks -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; background-color: #ffffff; margin-bottom: 24px;">
                    <tr>
                        <td style="padding: 20px;">
                            <span style="color: #1e3a8a; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; font-size: 14px; margin-right: 16px;">Remarks:</span>
                            @php
                                $p = $student->percentage;
                                if ($p >= 93) $rem = "Bravo! Look and work for top position in Board Exams.";
                                elseif ($p >= 80) $rem = "Perfection and consistency is needed. Best of luck for coming papers.";
                                elseif ($p >= 70) $rem = "Long productive sitting at home is required.";
                                elseif ($p >= 60) $rem = "Plan and start working with a serious attitude immediately.";
                                elseif ($p >= 50) $rem = "It is just a PASSING efficiency. Work hard to show better than it.";
                                elseif ($p >= 33) $rem = "Serious hard work in all subjects is needed.";
                                else $rem = "Serious hard work in all subjects is needed. It is a weak performance. !";
                            @endphp
                            <span style="color: #333333; font-weight: bold; font-size: 14px; font-style: italic;">{{ $rem }}</span>
                        </td>
                    </tr>
                </table>

                <!-- Official Signatures -->
                <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-top: 20px;">
                    <tr>
                        <td width="50%" align="center" style="padding: 10px;">
                            <div style="height: 48px; line-height: 48px;">
                                @if(!empty($student->teacher_signature))
                                    <img src="{{ $student->teacher_signature }}" alt="Class Incharge Signature" style="max-height: 44px; max-width: 160px; vertical-align: middle;">
                                @endif
                            </div>
                            <div style="border-top: 2px solid #000000; width: 75%; margin: 6px auto 0; padding-top: 6px;">
                                <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; display: block; letter-spacing: 0.5px;">Class Incharge</span>
                                @if(!empty($student->class_incharge))
                                    <span style="font-size: 11px; font-weight: bold; color: #333333; display: block; margin-top: 2px;">{{ $student->class_incharge }}</span>
                                @endif
                            </div>
                        </td>
                        <td width="50%" align="center" style="padding: 10px;">
                            <div style="height: 48px;"></div>
                            <div style="border-top: 2px solid #000000; width: 75%; margin: 6px auto 0; padding-top: 6px;">
                                <span style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #1e3a8a; display: block; letter-spacing: 0.5px;">Principal</span>
                            </div>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>
