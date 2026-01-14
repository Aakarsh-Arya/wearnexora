export interface Policy {
    title: string;
    content: string;
    effectiveDate: Date;
}

export interface PrivacyPolicy extends Policy {
    dataCollection: string[];
    userRights: string[];
}

export interface TermsOfService extends Policy {
    userResponsibilities: string[];
    limitationsOfLiability: string[];
}