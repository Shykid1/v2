/** Request body Arkesel POSTs to the USSD webhook on every keypress. */
export interface ArkeselUssdRequest {
  sessionID: string;
  userID: string;
  newSession: boolean;
  msisdn: string;
  userData: string;
  network?: string;
}

/** Response shape Arkesel expects back from the USSD webhook. */
export interface ArkeselUssdResponse {
  sessionID: string;
  userID: string;
  msisdn: string;
  message: string;
  continueSession: boolean;
}
