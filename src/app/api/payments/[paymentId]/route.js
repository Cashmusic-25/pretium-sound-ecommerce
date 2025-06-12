// src/app/api/payments/[paymentId]/route.js
const PORTONE_API_BASE = 'https://api.portone.io';

export async function GET(request, { params }) {
  try {
    const { paymentId } = params;

    // 1. 포트원 액세스 토큰 발급
    const getTokenResponse = await fetch(`${PORTONE_API_BASE}/login/api-secret`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiSecret: process.env.PORTONE_API_SECRET,
      }),
    });

    if (!getTokenResponse.ok) {
      throw new Error('포트원 토큰 발급 실패');
    }

    const { accessToken } = await getTokenResponse.json();

    // 2. 결제 정보 조회
    const getPaymentResponse = await fetch(`${PORTONE_API_BASE}/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!getPaymentResponse.ok) {
      throw new Error('결제 정보 조회 실패');
    }

    const payment = await getPaymentResponse.json();

    return Response.json({
      payment: {
        id: payment.id,
        status: payment.status,
        amount: payment.amount,
        method: payment.method,
        paidAt: payment.paidAt,
        failReason: payment.failReason,
        customer: payment.customer
      }
    });

  } catch (error) {
    console.error('결제 정보 조회 오류:', error);
    return Response.json(
      { error: '결제 정보 조회 실패' },
      { status: 500 }
    );
  }
}