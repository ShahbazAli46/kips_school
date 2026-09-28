<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>OTP Verification - Kips School Chunian Campus</title>
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
</head>
<body style="margin:0; padding:0; background-color:#f0f4f8; font-family: Arial, Helvetica, sans-serif; -webkit-font-smoothing: antialiased;">

@php
    $logoPath = public_path('logo.png');
    if (!file_exists($logoPath)) {
        $logoPath = public_path('logo.jpg');
    }
    $logoBase64 = file_exists($logoPath) ? base64_encode(file_get_contents($logoPath)) : '';
@endphp

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8; padding: 30px 16px;">
    <tr>
        <td align="center">

            <!-- Main Card -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); border: 1px solid #bfdbfe;">

                <!-- ===== HEADER ===== -->
                <tr>
                    <td align="center" style="background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); padding: 32px 24px 24px 24px;">
                        <!-- Logo Circle -->
                        <div style="background-color:#ffffff; border-radius:50%; width:88px; height:88px; margin:0 auto 16px auto; display:flex; align-items:center; justify-content:center; padding:6px; box-sizing:border-box; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                            @if(!empty($logoBase64))
                                <img
                                    src="data:image/png;base64,{{ $logoBase64 }}"
                                    alt="Kips School Chunian Campus Logo"
                                    width="76"
                                    height="76"
                                    style="display:block; border-radius:50%; object-fit:contain;"
                                />
                            @else
                                <img
                                    src="{{ asset('logo.png') }}"
                                    alt="Kips School Chunian Campus Logo"
                                    width="76"
                                    height="76"
                                    style="display:block; border-radius:50%; object-fit:contain;"
                                />
                            @endif
                        </div>
                        <!-- Academy Name -->
                        <h1 style="margin:0 0 8px 0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:0.01em; text-align:center;">Kips School Chunian Campus</h1>
                        <!-- Secure Entry Tag -->
                        <p style="margin:0; color:rgba(219,234,254,0.90); font-size:11px; font-weight:600; letter-spacing:0.18em; text-transform:uppercase; text-align:center;">&#128737; &nbsp;SECURE ENTRY PORTAL</p>
                    </td>
                </tr>

                <!-- ===== BODY ===== -->
                <tr>
                    <td style="padding: 28px 28px 0 28px; background-color:#fafcff;">
                        <!-- Greeting -->
                        <p style="margin:0 0 6px 0; font-size:20px; font-weight:600; color:#0f172a;">Hello,</p>
                        <p style="margin:0 0 20px 0; font-size:15px; color:#475569; line-height:1.6;">
                            Your one-time password for portal authentication is:
                        </p>
                        <!-- Divider -->
                        <hr style="border:none; border-top:1px solid #e2e8f0; margin:0 0 28px 0;"/>
                    </td>
                </tr>

                <!-- ===== OTP BOX ===== -->
                <tr>
                    <td align="center" style="padding: 0 28px 28px 28px; background-color:#fafcff;">
                        <!-- Outer dashed border -->
                        <div style="display:inline-block; border:2px dashed rgba(30,64,175,0.30); border-radius:16px; padding:8px; background-color:#eff6ff;">
                            <!-- Inner solid border -->
                            <div style="border:2px solid #1e40af; border-radius:10px; padding: 18px 52px; background-color:#ffffff;">
                                <span style="font-size:38px; font-weight:800; letter-spacing:0.28em; color:#1e40af; font-family: 'Courier New', Courier, monospace;">{{ $otpCode }}</span>
                            </div>
                        </div>
                    </td>
                </tr>

                <!-- ===== SECURITY NOTICE ===== -->
                <tr>
                    <td style="padding: 0 28px 24px 28px; background-color:#fafcff;">
                        <div style="border-left: 4px solid #0284c7; background-color:#f0f9ff; border-radius:0 8px 8px 0; padding:14px 16px;">
                            <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; color:#0369a1; text-transform:uppercase; letter-spacing:0.12em;">Important Security Notice</p>
                            <p style="margin:0; font-size:14px; color:#334155; line-height:1.6;">
                                This code is valid for the next <strong style="color:#0f172a;">10 minutes</strong>. Please do not share this code with anyone for your own security.
                            </p>
                        </div>
                    </td>
                </tr>

                <!-- ===== CONTACT INFO ===== -->
                <tr>
                    <td style="padding: 0 28px 28px 28px; background-color:#fafcff;">
                        <div style="background-color:#f8fafc; border-radius:12px; padding:20px; border:1px solid #e2e8f0;">
                            <p style="margin:0 0 12px 0; font-size:14px; font-weight:700; color:#1e293b;">&#128222; &nbsp;Help & Support</p>

                            <!-- Helpline Phone -->
                            <a href="tel:+923003939581" style="display:block; text-decoration:none; background-color:#ffffff; border:1px solid #cbd5e1; border-radius:8px; padding:12px 14px;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                    <tr>
                                        <td style="font-size:14px; font-weight:500; color:#1e293b;">
                                            &#128222; &nbsp;+92 300 3939581
                                        </td>
                                        <td align="right" style="font-size:18px; color:#94a3b8;">›</td>
                                    </tr>
                                </table>
                            </a>
                        </div>
                    </td>
                </tr>

                <!-- ===== FOOTER ===== -->
                <tr>
                    <td align="center" style="background-color:#eff6ff; border-top:1px solid #dbeafe; padding:20px 24px;">
                        <p style="margin:0 0 4px 0; font-size:12px; font-weight:700; color:#1e3a8a; text-transform:uppercase; letter-spacing:0.14em;">Kips School Chunian Campus</p>
                        <p style="margin:0 0 12px 0; font-size:12px; color:#64748b;">Chunian, Pakistan</p>
                        <p style="margin:0; font-size:11px; color:#94a3b8; font-style:italic;">
                            &copy; {{ date('Y') }} Kips School Chunian Campus. All rights reserved.
                        </p>
                    </td>
                </tr>

            </table>
            <!-- End Main Card -->

        </td>
    </tr>
</table>

</body>
</html>
