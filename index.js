import env from "dotenv"
import fetch from "node-fetch"
env.config()
const entityApiSecretKey = process.env.ENTITYAPIKEY
const namespace = "testnet"
let issuerDidDocument;
let holderDidDoc
let didDocument
let dayPassCredential;
let verificationMethodId;
const origin = "https://api.entity.hypersign.id"
let invoiceCred;
let idCredential
let accessToken;
let presentation
async function generateAccessToken() {
    console.log("generateAccessToken method")
    const response = await fetch("https://api.entity.hypersign.id/api/v1/app/oauth", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-Api-Secret-Key": entityApiSecretKey,
            "origin": origin
        }
    })
    const resp = await response.json()
    accessToken = resp.access_token
}
async function createAndRegisterDid() {
    let result = await fetch("https://api.entity.hypersign.id/api/v1/did/create", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "authorization": `Bearer ${accessToken}`,
            "origin": origin
        },
        body: JSON.stringify({ namespace })
    })
    result = await result.json()
    didDocument = result.metaData.didDocument
    verificationMethodId = didDocument.verificationMethod[0].id
    const registerDidDoc = await fetch("https://api.entity.hypersign.id/api/v1/did/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "authorization": `Bearer ${accessToken}`,
            "origin": "https://api.entity.hypersign.id"
        },
        body: JSON.stringify({ didDocument, verificationMethodId })
    })
    const resp = await registerDidDoc.json()
    didDocument = resp.metaData.didDocument
    return didDocument

}

async function generateDids() {
    issuerDidDocument = await createAndRegisterDid()
    holderDidDoc = await createAndRegisterDid()

}
async function generateAndIssueCredential({ fields, schemaContext, schemaId }) {
    try {
        if (!schemaContext && !schemaId) {
            throw (`either schema context or sschemaId is mandatory`)
        }
        let format;
        if (schemaContext) {
            format = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${accessToken}`,
                    "origin": origin
                },
                body: JSON.stringify({
                    schemaContext: ["https://schema.org"],
                    type: [],
                    subjectDid: holderDidDoc.id,
                    issuerDid: issuerDidDocument.id,
                    fields,
                    namespace,
                    expirationDate: "2027-12-31T23:59:59Z",
                    verificationMethodId: issuerDidDocument.verificationMethod[0].id,
                    persist: true
                })
            }
        } else {
            format = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "authorization": `Bearer ${accessToken}`,
                    "origin": origin
                },
                body: JSON.stringify({
                    schemaId: schemaId,
                    subjectDid: holderDidDoc.id,
                    issuerDid: issuerDidDocument.id,
                    fields,
                    namespace,
                    expirationDate: "2027-12-31T23:59:59Z",
                    verificationMethodId: issuerDidDocument.verificationMethod[0].id,
                    persist: true
                })
            }
        }
        const credential = await fetch("https://api.entity.hypersign.id/api/v1/credential/issue", format)
        const cred = await credential.json()
        return cred
    } catch (e) {
        throw (e.message)
    }
}
async function generateCredentials() {
    console.log('generateCredentials method')
    const idCredField = {
        name: "varsha",
        dob: "09/06/1998",
        phoneNumber: "1234556721",
        email: "xyz@gmail.com"
    }
    const schemaContext = ["https://schema.org"]
    const idCredSchemaId = "sch:hid:testnet:zE1EYEwvjLiDUp9bea9YBaa2LYiK9xLD3n892hPUx4myX:1.0"
    idCredential = await generateAndIssueCredential({ fields: idCredField, schemaContext })
    console.log(idCredential)
    const invoiceCredField = {
        accountId: "123123",
        broker: "RazorPay",
        invoiceNumber: "12314",
        customer: "user",
        provider: "Beehive Workspace",
        paymentMethod: "UPI",
        paymentStatus: "Success",
    }
    const invoiceCredSchemaId = "sch:hid:testnet:zAhcVCadHPe38qFMeS3eNpuC4z5BhPF4q3vBqtuHKmCnk:1.0"
    invoiceCred = await generateAndIssueCredential({ fields: invoiceCredField, schemaContext })
    console.log(invoiceCred)
    const dayPassCredField = {
        fullname: "varsha kumari",
        companyName: "Hypermine",
        issuanceDate: new Date(),
        expirationDate: "2027-12-31T23:59:59Z",
        center: "Delhi",
        issuer: "varsha",
        invoiceNumber: "12314"
    }
    const schemaId = "sch:hid:testnet:zCJQyXUTMwGmgdDjAKsQNtaeiX9Wc7pB1vpMYesztomDA:1.0"
    dayPassCredential = await generateAndIssueCredential({ fields: dayPassCredField, schemaId })
    console.log(dayPassCredential)
}
async function generatePresentation() {
    const challenge = "xyd12445b4u5gn"
    const result = await fetch("https://api.entity.hypersign.id/api/v1/presentation", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "authorization": `Bearer ${accessToken}`,
            "origin": origin
        },
        body: JSON.stringify({
            credentialDocuments: [
                idCredential.credentialDocument,
                invoiceCred.credentialDocument,
                dayPassCredential.credentialDocument
            ],
            holderDid: holderDidDoc.id,
            domain: "https://hypersign.id",
            challenge
        })
    })
    presentation = await result.json()
    console.log(JSON.stringify(presentation, null, 2))
}

async function init() {
    await generateAccessToken()
    await generateDids()
    await generateCredentials()
    await generatePresentation()
}
init()

