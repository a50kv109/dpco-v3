import { ClaimVerdict, ExecStatus, VerifyStatus } from './models';

export class ResultClassifier {
  classify(
    execStatus: ExecStatus,
    verifyStatus: VerifyStatus,
    claimVerdict: ClaimVerdict
  ): [ExecStatus, ClaimVerdict, VerifyStatus] {
    if (execStatus === ExecStatus.BLOCKED) {
      return [execStatus, ClaimVerdict.UNKNOWN, VerifyStatus.UNVERIFIED];
    }
    if (execStatus === ExecStatus.FAILED) {
      return [execStatus, ClaimVerdict.UNKNOWN, VerifyStatus.NOT_APPLICABLE];
    }
    return [execStatus, claimVerdict, verifyStatus];
  }
}
