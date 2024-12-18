/* eslint-disable prefer-const */
import { PairHourData, User, UserPairDayData } from '../../generated/schema'
import { BigInt, BigDecimal, ethereum } from '@graphprotocol/graph-ts'
import { Pair, Bundle, Token, dexFactory, dexDayData, PairDayData, TokenDayData } from '../../generated/schema'
import { ONE_BI, ZERO_BD, ZERO_BI, FACTORY_ADDRESS } from './helpers'

export function updatedexDayData(event: ethereum.Event): dexDayData {
  let currentDex = dexFactory.load(FACTORY_ADDRESS)
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dexDayData = dexDayData.load(dayID.toString())
  if (dexDayData === null) {
    dexDayData = new dexDayData(dayID.toString())
    dexDayData.date = dayStartTimestamp
    dexDayData.dailyVolumeUSD = ZERO_BD
    dexDayData.dailyVolumeETH = ZERO_BD
    dexDayData.totalVolumeUSD = ZERO_BD
    dexDayData.totalVolumeETH = ZERO_BD
    dexDayData.dailyVolumeUntracked = ZERO_BD
  }

  dexDayData.totalLiquidityUSD = currentDex.totalLiquidityUSD
  dexDayData.totalLiquidityETH = currentDex.totalLiquidityETH
  dexDayData.txCount = currentDex.txCount
  dexDayData.save()

  return dexDayData as dexDayData
}

export function updatePairDayData(event: ethereum.Event): PairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let pair = Pair.load(event.address.toHexString())
  let pairDayData = PairDayData.load(dayPairID)
  if (pairDayData === null) {
    pairDayData = new PairDayData(dayPairID)
    pairDayData.date = dayStartTimestamp
    pairDayData.token0 = pair.token0
    pairDayData.token1 = pair.token1
    pairDayData.pairAddress = event.address
    pairDayData.dailyVolumeToken0 = ZERO_BD
    pairDayData.dailyVolumeToken1 = ZERO_BD
    pairDayData.dailyVolumeUSD = ZERO_BD
    pairDayData.dailyTxns = ZERO_BI
  }

  pairDayData.totalSupply = pair.totalSupply
  pairDayData.reserve0 = pair.reserve0
  pairDayData.reserve1 = pair.reserve1
  pairDayData.reserveUSD = pair.reserveUSD
  pairDayData.dailyTxns = pairDayData.dailyTxns.plus(ONE_BI)
  pairDayData.save()

  return pairDayData as PairDayData
}

export function updateUserDayData(event: ethereum.Event, trackedAmountUSD: BigDecimal): UserPairDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPairID = event.transaction.from
    .toHexString()
    .concat('-')
    .concat(event.address.toHexString())
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())
  let pair = Pair.load(event.address.toHexString())
  let user = User.load(event.transaction.from.toHexString())
  let userPairDayData = UserPairDayData.load(dayPairID)
  if (userPairDayData === null) {
    userPairDayData = new UserPairDayData(dayPairID)
    userPairDayData.date = dayStartTimestamp
    userPairDayData.pair = pair.id
    userPairDayData.user = user.id
    userPairDayData.dailyVolumeUSD = ZERO_BD
  }
  userPairDayData.dailyVolumeUSD = userPairDayData.dailyVolumeUSD.plus(trackedAmountUSD)
  user.usdSwapped = user.usdSwapped.plus(trackedAmountUSD)
  user.transactionCount = user.transactionCount.plus(ONE_BI)
  userPairDayData.save()
  user.save()
  return userPairDayData as UserPairDayData
}

export function updatePairHourData(event: ethereum.Event): PairHourData {
  let timestamp = event.block.timestamp.toI32()
  let hourIndex = timestamp / 3600 // get unique hour within unix history
  let hourStartUnix = hourIndex * 3600 // want the rounded effect
  let hourPairID = event.address
    .toHexString()
    .concat('-')
    .concat(BigInt.fromI32(hourIndex).toString())
  let pair = Pair.load(event.address.toHexString())
  let pairHourData = PairHourData.load(hourPairID)
  if (pairHourData === null) {
    pairHourData = new PairHourData(hourPairID)
    pairHourData.hourStartUnix = hourStartUnix
    pairHourData.pair = event.address.toHexString()
    pairHourData.hourlyVolumeToken0 = ZERO_BD
    pairHourData.hourlyVolumeToken1 = ZERO_BD
    pairHourData.hourlyVolumeUSD = ZERO_BD
    pairHourData.hourlyTxns = ZERO_BI
  }

  pairHourData.reserve0 = pair.reserve0
  pairHourData.reserve1 = pair.reserve1
  pairHourData.reserveUSD = pair.reserveUSD
  pairHourData.hourlyTxns = pairHourData.hourlyTxns.plus(ONE_BI)
  pairHourData.save()

  return pairHourData as PairHourData
}

export function updateTokenDayData(token: Token, event: ethereum.Event): TokenDayData {
  let bundle = Bundle.load('1')
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let tokenDayID = token.id
    .toString()
    .concat('-')
    .concat(BigInt.fromI32(dayID).toString())

  let tokenDayData = TokenDayData.load(tokenDayID)
  if (tokenDayData === null) {
    tokenDayData = new TokenDayData(tokenDayID)
    tokenDayData.date = dayStartTimestamp
    tokenDayData.token = token.id
    tokenDayData.priceUSD = token.derivedETH.times(bundle.ethPrice)
    tokenDayData.dailyVolumeToken = ZERO_BD
    tokenDayData.dailyVolumeETH = ZERO_BD
    tokenDayData.dailyVolumeUSD = ZERO_BD
    tokenDayData.dailyTxns = ZERO_BI
    tokenDayData.totalLiquidityUSD = ZERO_BD
  }
  tokenDayData.priceUSD = token.derivedETH.times(bundle.ethPrice)
  tokenDayData.totalLiquidityToken = token.totalLiquidity
  tokenDayData.totalLiquidityETH = token.totalLiquidity.times(token.derivedETH as BigDecimal)
  tokenDayData.totalLiquidityUSD = tokenDayData.totalLiquidityETH.times(bundle.ethPrice)
  tokenDayData.dailyTxns = tokenDayData.dailyTxns.plus(ONE_BI)
  tokenDayData.save()

  /**
   * @todo test if this speeds up sync
   */
  // updateStoredTokens(tokenDayData as TokenDayData, dayID)
  // updateStoredPairs(tokenDayData as TokenDayData, dayPairID)

  return tokenDayData as TokenDayData
}
