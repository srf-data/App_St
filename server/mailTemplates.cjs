const fs = require('fs');
const path = require('path');

const getBase64Logo = () => {
    try {
        const logoPath = path.join(__dirname, '..', 'src', 'assets', 'brand-logo-new.svg');
        const svg = fs.readFileSync(logoPath, 'utf8');
        return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    } catch (e) {
        return '';
    }
};

const forgotPasswordTemplate = (otp) => {
    const logoBase64 = getBase64Logo();
    
    return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinição de Senha - St. Solart</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@800&display=swap" rel="stylesheet">
        <style>
            body { font-family: 'Plus Jakarta Sans', Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .header { padding: 40px 20px; text-align: center; background-color: #FAFAFA; border-bottom: 1px solid #F0F0F3; }
            .brand-container { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
            .logo { height: 32px; width: auto; vertical-align: middle; }
            .brand-text { font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 26px; font-weight: 800; color: #021D48; letter-spacing: -1.2px; vertical-align: middle; margin-left: 2px; }
            .content { padding: 40px 30px; text-align: center; }
            .title { color: #0D0D0D; font-size: 24px; font-weight: 800; margin-bottom: 10px; }
            .text { color: #606060; font-size: 16px; line-height: 1.6; margin-bottom: 30px; }
            .otp-container { background-color: #FDF2EE; border: 2px dashed #F84910; border-radius: 12px; padding: 20px; display: inline-block; margin-bottom: 30px; }
            .otp-code { color: #F84910; font-size: 36px; font-weight: 800; letter-spacing: 12px; margin: 0; }
            .footer { padding: 20px; text-align: center; background-color: #FAFAFA; color: #BEBEBE; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <center>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                        <tr>
                            <td align="center">
                                ${logoBase64 ? `<img src="${logoBase64}" alt="St. Solart" style="height: 46px; width: auto; display: block;">` : ''}
                            </td>
                        </tr>
                        <tr><td style="height: 4px; font-size: 4px; line-height: 4px;">&nbsp;</td></tr>
                        <tr>
                            <td align="center">
                                <span style="font-family: 'Plus Jakarta Sans', Arial, sans-serif; font-size: 24px; font-weight: 800; color: #021D48; letter-spacing: -1.2px; display: block; line-height: 1;">st.solart</span>
                            </td>
                        </tr>
                    </table>
                </center>
            </div>
            <div class="content">
                <h2 class="title">Recuperação de Senha</h2>
                <p class="text">Olá! Recebemos uma solicitação para redefinir a senha da sua conta no <strong>St. Solart</strong>. Use o código abaixo para prosseguir:</p>
                
                <div class="otp-container">
                    <p class="otp-code">${otp}</p>
                </div>
                
                <p class="text">Este código expira em 15 minutos. Se você não solicitou essa alteração, pode ignorar este e-mail.</p>
                
                <p style="color: #606060; font-size: 14px;">Atenciosamente,<br><strong>Equipe St. Solart</strong></p>
            </div>
            <div class="footer">
                &copy; 2026 St. Solart - Gestão Inteligente para Produção Artesanal.
            </div>
        </div>
    </body>
    </html>
    `;
};

module.exports = { forgotPasswordTemplate };
