import { NextRequest, NextResponse } from "next/server";
import { TradeCommand, PreviewCard } from "@/lib/types";
import { getLiquidClient } from "@/lib/liquid";
import { validateSymbol, validateLeverage, validateOrderSize, validateBalance } from "@/lib/validator";
import { storePendingCommand } from "@/lib/session";
import { MAX_LEVERAGE, MAX_ORDER_USD } from "@/lib/constants";

export async function POST(req: NextRequest) {
  try {
    const command = (await req.json()) as TradeCommand;

    if (!command.action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    const liquid = getLiquidClient();
    const warnings: string[] = [];
    const details: Record<string, string | number> = {};

    details["Action"] = command.action;

    if (command.symbol) {
      validateSymbol(command.symbol);
      details["Symbol"] = command.symbol;
    }

    if (command.leverage !== undefined) {
      validateLeverage(command.leverage);
      details["Leverage"] = `${command.leverage}x`;
      if (command.leverage > 5) {
        warnings.push(`High leverage (${command.leverage}x) — liquidation risk is elevated`);
      }
    }

    if (command.size_usd !== undefined) {
      validateOrderSize(command.size_usd);
      details["Size (USD)"] = `$${command.size_usd}`;
    }

    if (command.side) {
      details["Side"] = command.side.toUpperCase();
    }

    if (command.order_type) {
      details["Order Type"] = command.order_type;
    }

    if (command.tp !== undefined) {
      details["Take Profit"] = `$${command.tp}`;
    }

    if (command.sl !== undefined) {
      details["Stop Loss"] = `$${command.sl}`;
    }

    // Fetch account for balance check and mark price
    let markPrice: number | null = null;
    try {
      const account = await liquid.getAccount();
      const availableUsd = account.available_usd;

      if (command.size_usd !== undefined) {
        validateBalance(command.size_usd, availableUsd);
        details["Available Balance"] = `$${availableUsd.toFixed(2)}`;
      }

      if (command.symbol) {
        try {
          const ticker = await liquid.getTicker(command.symbol);
          markPrice = ticker.mark_price;
          details["Mark Price"] = `$${markPrice.toFixed(2)}`;
        } catch {
          warnings.push("Could not fetch mark price — estimate may be stale");
        }
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("balance")) throw err;
      warnings.push("Could not verify account balance — proceed with caution");
    }

    if (!command.tp && !command.sl && command.action === "place_order") {
      warnings.push("No take-profit or stop-loss set — position will have no automatic risk management");
    }

    const summary = buildSummary(command, markPrice);
    const confirmation_token = storePendingCommand(command);

    const preview: PreviewCard = {
      type: "trade",
      summary,
      details,
      confirmation_token,
      warnings,
    };

    return NextResponse.json(preview);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    const status = message.includes("exceeds") || message.includes("Invalid") || message.includes("balance") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

function buildSummary(cmd: TradeCommand, markPrice: number | null): string {
  if (cmd.action === "panic") return "Close all positions and cancel all orders";
  if (cmd.action === "cancel_all_orders") return "Cancel all open orders";
  if (cmd.action === "close_position" && cmd.symbol) return `Close ${cmd.symbol} position`;

  const side = cmd.side ? cmd.side.toUpperCase() : "";
  const size = cmd.size_usd ? `$${cmd.size_usd}` : "";
  const symbol = cmd.symbol ?? "";
  const leverage = cmd.leverage ? ` @ ${cmd.leverage}x` : "";
  const price = markPrice ? ` (mark: $${markPrice.toFixed(2)})` : "";

  return `${side} ${size} of ${symbol}${leverage}${price}`.trim();
}
