import jsonStringify from 'fast-json-stable-stringify';
import BigNumber from 'bignumber.js';
import { StdFee } from '@cosmjs/stargate';
import { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin';

import {
  ISCN_REGISTRY_NAME,
  GAS_ESTIMATOR_INTERCEPT,
  GAS_ESTIMATOR_SLOPE,
  GAS_ESTIMATOR_BUFFER_RATIO,
  DEFAULT_GAS_PRICE_NUMBER,
  STUB_WALLET,
} from '../constant';
import { formatISCNPayload, formatMsgCreateIscnRecord } from '../messages/iscn';
import { ISCNSignPayload } from '../types';
import formatGasFee from './gas';
import ISCNQueryClient from '../queryClient';

export async function estimateISCNTxFee(
  queryClient: ISCNQueryClient,
  payload: ISCNSignPayload,
  denom: string,
  { version = 1 } = {},
): Promise<Coin> {
  const record = formatISCNPayload(payload);
  const feePerByte = await queryClient.queryFeePerByte();
  const feePerByteAmount = feePerByte ? parseInt(feePerByte.amount, 10) : 1;
  const {
    recordNotes,
    contentFingerprints,
    stakeholders,
    contentMetadata,
  } = record;
  const now = new Date();
  const obj = {
    '@context': {
      '@vocab': 'http://iscn.io/',
      recordParentIPLD: {
        '@container': '@index',
      },
      stakeholders: {
        '@context': {
          '@vocab': 'http://schema.org/',
          entity: 'http://iscn.io/entity',
          rewardProportion: 'http://iscn.io/rewardProportion',
          contributionType: 'http://iscn.io/contributionType',
          footprint: 'http://iscn.io/footprint',
        },
      },
      contentMetadata: {
        '@context': null,
      },
    },
    '@type': 'Record',
    '@id': `iscn://${ISCN_REGISTRY_NAME}/btC7CJvMm4WLj9Tau9LAPTfGK7sfymTJW7ORcFdruCU/1`,
    recordTimestamp: now.toISOString(),
    recordVersion: version,
    recordNotes,
    contentFingerprints,
    recordParentIPLD: {},
  };
  if (version > 1) {
    obj.recordParentIPLD = {
      '/': 'bahuaierav3bfvm4ytx7gvn4yqeu4piiocuvtvdpyyb5f6moxniwemae4tjyq',
    };
  }
  const byteSize = Buffer.from(jsonStringify(obj), 'utf-8').length
      + Buffer.from(jsonStringify({ stakeholders: [], contentMetadata: {} }), 'utf-8').length
      + stakeholders.reduce((acc, s) => acc + s.length, 0)
      + stakeholders.length
      + contentMetadata.length;
  const feeAmount = new BigNumber(byteSize).multipliedBy(feePerByteAmount);
  return {
    amount: feeAmount.toFixed(0, 0),
    denom: feePerByte?.denom || denom,
  } as Coin;
}

export function estimateISCNTxGas(payload: ISCNSignPayload, {
  denom,
  gasPrice = DEFAULT_GAS_PRICE_NUMBER,
  memo,
}: {
    denom: string,
    gasPrice?: number,
    memo?: string,
  }): StdFee {
  const msg = formatMsgCreateIscnRecord(STUB_WALLET, payload);
  const value = {
    msg: [msg],
    // temp number here for estimation
    fee: formatGasFee({ gas: '200000', gasPrice: '1', denom }),
  };
  const obj = {
    type: 'cosmos-sdk/StdTx',
    value,
    memo, // directly append memo to object if exists, since we only need its length
  };
  const txBytes = Buffer.from(jsonStringify(obj), 'utf-8');
  const byteSize = new BigNumber(txBytes.length);
  const gasUsedEstimationBeforeBuffer = byteSize
    .multipliedBy(GAS_ESTIMATOR_SLOPE)
    .plus(GAS_ESTIMATOR_INTERCEPT);
  const buffer = gasUsedEstimationBeforeBuffer.multipliedBy(GAS_ESTIMATOR_BUFFER_RATIO);
  const gasUsedEstimation = gasUsedEstimationBeforeBuffer.plus(buffer);
  const gas = gasUsedEstimation.toFixed(0, 0);
  return formatGasFee({ gas, gasPrice, denom });
}
