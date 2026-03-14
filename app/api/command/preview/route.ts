import { NextRequest, NextResponse } from "next/server";
import { liquidClient } from "@/lib/liquid";
import {
  validateSymbol,
  validateLeverage,
  validateOrderSize,
  validateBalance,
} from "@/lib/validator";
import { storePendingCommand } from "@/lib/session";
import type { TradeCommand, PreviewCard } from "@/lib/types";

export async function POST(req: NextRequest) {
  let command: TradeCommand;
  try {
    command = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!command?.action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    const warnings: string[] = [];
    const details: Record<string, string | number> = {};
    details["action"] = command.action;

    if (command.action === "place_order") {
      // Validate inputs
      validateSymbol(command.symbol);
      validateOrderSize(command.size_usd);
      validateLeverage(command.leverage);

      // Get live account + ticker
      const [account, ticker] = await Promise.all([
        liquidClient.getAccount().catch(() => null),
        command.symbol ? liquidClient.getTicker(command.symbol).catch(() => null) : null,
      ]);

      const usdBalance = account?.find((b) => b.currency === "USD");
      const available_usd = usdBalance
        ? Math.max(0, parseFloat(usdBalance.balance) - parseFloat(usdBalance.reserved_balance))
        : null;

      if (available_usd !== null) {
        validateBalance(command.size_usd!, available_usd);
        details["available_balance"] = `$${available_usd.toFixed(2)}`;
      } else {
        warnings.push("Could not verify account balance — proceeding with validation only");
      }

      details["symbol"] = command.symbol ?? "";
      details["side"] = command.side ?? "buy";
      details["size_usd"] = `$${command.size_usd}`;
      details["order_type"] = command.order_type ?? "market";

      if (ticker) {
        details["current_price"] = `$${ticker.mark_price.toLocaleString()}`;
        const estimatedQty = command.size_usd! / ticker.mark_price;
        details["estimated_quantity"] = estimatedQty.toFixed(6);
      }
      if (command.leverage) details["leverage"] = `${command.leverage}x`;
      if (command.tp) details["take_profit"] = `$${command.tp}`;
      if (command.sl) details["stop_loss"] = `$${command.sl}`;
      if (command.leverage && command.leverage > 5) {
        warnings.push(`High leverage (${command.leverage}x) — risk of liquidation`);
      }
    } else if (command.action === "close_position") {
      validateSymbol(command.symbol);
      details["symbol"] = command.symbol ?? "";
      const positions = await liquidClient.getPositions().catch(() => []);
      const position = positions.find(
        (p) =>
          p.product_code.toUpperCase().includes((command.symbol ?? "").replace("-PERP", ""))
      );
      if (position) {
        details["position_size"] = position.quantity;
        details["unrealized_pnl"] = `$${parseFloat(position.unrealized_pnl).toFixed(2)}`;
      } else {
        warnings.push("No open position found for this symbol");
      }
    } else if (command.action === "cancel_all_orders") {
      const orders = await liquidClient.getOpenOrders().catch(() => []);
      details["open_orders_to_cancel"] = orders.length;
      if (orders.length === 0) warnings.push("No open orders to cancel");
    } else if (command.action === "panic") {
      warnings.push("This will close ALL positions and cancel ALL orders immediately");
    }

    const token = storePendingCommand(command);

    const summary =
      command.action === "place_order"
        ? `${(command.side ?? "buy").toUpperCase()} $${command.size_usd} of ${command.symbol}`
        : command.action === "close_position"
        ? `Close ${command.symbol} position`
        : command.action === "cancel_all_orders"
        ? "Cancel all open orders"
        : command.action === "panic"
        ? "PANIC — close all positions and cancel all orders"
        : command.action;

    const preview: PreviewCard = {
      type: "trade",
      summary,
      details,
      confirmation_token: token,
      warnings,
    };

    return NextResponse.json(preview);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Preview failed" },
      { status: 400 }
    );
  }
}
