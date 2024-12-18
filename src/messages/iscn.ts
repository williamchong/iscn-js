// eslint-disable-next-line import/no-extraneous-dependencies
import { EncodeObject } from '@cosmjs/proto-signing';
// eslint-disable-next-line import/no-extraneous-dependencies
import Long from 'long';
import { ISCNSignPayload, Stakeholder } from '../types';
import globalThis from '../globalThis';

export function formatISCNPayload(payload: ISCNSignPayload, version = 1): {
    recordNotes?: string;
    contentFingerprints: string[];
    stakeholders: Uint8Array[];
    contentMetadata: Uint8Array;
  } {
  const {
    name,
    description,
    keywords = [],
    url,
    contentFingerprints,
    stakeholders: inputStakeholders = [],
    type,
    usageInfo,
    recordNotes,
    contentMetadata: inputMetadata = {},
    ...data
  } = payload;

  const stakeholders = inputStakeholders.map((s: Stakeholder) => globalThis.Buffer.from(
    JSON.stringify(s),
    'utf8',
  ));
  const contentMetadata = {
    '@context': 'http://schema.org/',
    '@type': type,
    name,
    description,
    version,
    url,
    keywords: Array.isArray(keywords) ? keywords.join(',') : keywords,
    usageInfo,
    ...data,
    ...inputMetadata,
  };
  return {
    recordNotes,
    contentFingerprints,
    stakeholders,
    contentMetadata: globalThis.Buffer.from(JSON.stringify(contentMetadata), 'utf8'),
  };
}

export function formatMsgCreateIscnRecord(
  senderAddress: string, payload: ISCNSignPayload, nonce?: number,
): EncodeObject {
  const record = formatISCNPayload(payload);
  const message = {
    typeUrl: '/likechain.iscn.MsgCreateIscnRecord',
    value: {
      from: senderAddress,
      record,
    } as any,
  };
  // field nonce: 0 will be ignored when Marshaling in Go
  if (nonce) {
    message.value.nonce = Long.fromNumber(nonce);
  }
  return message;
}

export function formatMsgUpdateIscnRecord(
  senderAddress: string, iscnId: string, payload: ISCNSignPayload,
): EncodeObject {
  const record = formatISCNPayload(payload);
  const message = {
    typeUrl: '/likechain.iscn.MsgUpdateIscnRecord',
    value: {
      from: senderAddress,
      iscnId,
      record,
    },
  };
  return message;
}

export function formatMsgChangeIscnRecordOwnership(
  senderAddress: string, iscnId: string, newOwnerAddress: string,
): EncodeObject {
  const message = {
    typeUrl: '/likechain.iscn.MsgChangeIscnRecordOwnership',
    value: {
      from: senderAddress,
      iscnId,
      newOwner: newOwnerAddress,
    },
  };
  return message;
}
