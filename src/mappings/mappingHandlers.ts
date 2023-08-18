import {
  SubstrateExtrinsic,
  SubstrateEvent,
  SubstrateBlock,
} from "@subql/types";
import { Account, Transfer, BlockEntity, ExtrinsicEntity } from "../types";
import { Balance } from "@polkadot/types/interfaces";
import { decodeAddress } from "@polkadot/util-crypto";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
  // Do something with each block handler here
  logger.info(
    `Saving block ${block.block.header.number.toString()}`
  );
  const blockEntity: BlockEntity = BlockEntity.create({
    id: block.block.header.hash.toString(),
    blockNumber: block.block.header.number.toNumber(),
    timestamp: block.timestamp.toString()
  });
  await blockEntity.save();
}

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
  logger.info(
    `New Extrinsic found at block ${extrinsic.block.block.header.number.toString()}`
  );
  const extrinsicEntity = ExtrinsicEntity.create({
    id: extrinsic.block.block.header.hash.toString(),
    blockNumber: extrinsic.block.block.header.number.toNumber(),
    timestamp: extrinsic.block.timestamp.toString()
  })
  await extrinsicEntity.save();
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
  logger.info(
    `New transfer event found at block ${event.block.block.header.number.toString()}`
  );

  // Get data from the event
  // The balances.transfer event has the following payload \[from, to, value\]
  // logger.info(JSON.stringify(event));
  const {
    event: {
      data: [from, to, amount],
    },
  } = event;

  const blockNumber: number = event.block.block.header.number.toNumber();

  const fromAccount = await checkAndGetAccount(from.toString(), blockNumber);
  const toAccount = await checkAndGetAccount(to.toString(), blockNumber);

  // Create the new transfer entity
  const transfer = Transfer.create({
    id: `${event.block.block.header.number.toNumber()}-${event.idx}`,
    blockNumber,
    date: event.block.timestamp,
    fromId: fromAccount.id,
    toId: toAccount.id,
    amount: (amount as Balance).toBigInt(),
  });

  fromAccount.lastTransferBlock = blockNumber;
  toAccount.lastTransferBlock = blockNumber;

  await Promise.all([fromAccount.save(), toAccount.save(), transfer.save()]);
}

async function checkAndGetAccount(
  id: string,
  blockNumber: number
): Promise<Account> {
  let account = await Account.get(id.toLowerCase());
  if (!account) {
    // We couldn't find the account
    account = Account.create({
      id: id.toLowerCase(),
      publicKey: decodeAddress(id).toString().toLowerCase(),
      firstTransferBlock: blockNumber,
    });
  }
  return account;
}
