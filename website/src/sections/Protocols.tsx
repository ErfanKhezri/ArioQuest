import { AnimatePresence, m, useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Ario } from "@/components/ui/Ario";
import { Icon } from "@/components/ui/Icon";
import { MethodBadge } from "@/components/ui/MethodBadge";
import { Fragment, JsonLine, VarText } from "../components/Fragment";
import { inView, rise, sleep } from "../lib/motion";

const STREAM = ["PLACED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];

function HttpSide() {
  return (
    <Fragment className="flex flex-col">
      <div className="flex items-center gap-2 p-2">
        <div className="flex min-w-0 flex-1 items-center rounded-md border border-line bg-canvas">
          <span className="border-r border-line px-2 py-1.5">
            <MethodBadge method="POST" className="w-auto" />
          </span>
          <span className="truncate px-2 font-mono text-xs">
            <VarText text="{{baseUrl}}/orders" />
          </span>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg">
          <Icon name="send" size={12} /> Send
        </span>
      </div>
      <div className="flex gap-4 px-3 pb-2 text-xs text-muted">
        <span>Params</span>
        <span>Headers 2</span>
        <span className="text-fg">Body</span>
        <span>Auth</span>
      </div>
      <div className="flex gap-1 px-3 pb-2 text-2xs text-muted">
        {["JSON", "Form", "Multipart", "GraphQL", "Binary"].map((mode, i) => (
          <span
            key={mode}
            className={i === 0 ? "rounded-sm bg-panel-2 px-1.5 py-0.5 text-fg" : "px-1.5 py-0.5"}
          >
            {mode}
          </span>
        ))}
      </div>
      <div className="px-3 pb-3 font-mono text-xs leading-5">
        {[
          "{",
          '  "item": "Mechanical keyboard",',
          '  "quantity": 1,',
          '  "express": true',
          "}",
        ].map((l) => (
          <JsonLine key={l} text={l} />
        ))}
      </div>
      <div className="mt-auto bg-canvas/60 px-3 py-3 font-mono text-xs leading-5">
        <p className="mb-1 font-sans">
          <span className="font-semibold text-status-2xx">201 Created</span>
          <span className="ml-3 text-muted tabular-nums">64 ms · 41 B</span>
        </p>
        <JsonLine text='{ "orderId": "ord_7f3c", "status": "PLACED" }' />
      </div>
    </Fragment>
  );
}

function GrpcSide() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { amount: 0.4 });
  const reduced = useReducedMotion();
  const [count, setCount] = useState(STREAM.length);

  useEffect(() => {
    if (!visible || reduced) return;
    let alive = true;
    void (async () => {
      while (alive) {
        for (let n = 0; n <= STREAM.length && alive; n++) {
          setCount(n);
          await sleep(n === 0 ? 700 : 900);
        }
        await sleep(3000);
      }
    })();
    return () => {
      alive = false;
    };
  }, [visible, reduced]);

  const complete = count === STREAM.length;

  return (
    <Fragment className="flex h-full flex-col">
      <div ref={ref} className="flex flex-wrap items-center gap-2 p-2">
        <span className="rounded-md border border-line bg-canvas px-2 py-1.5 font-mono text-xs">
          localhost:50051
        </span>
        <span className="min-w-0 flex-1 truncate rounded-md border border-line bg-canvas px-2 py-1.5 font-mono text-xs">
          orders.v1.OrderService/WatchOrder
        </span>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-3 text-xs font-medium text-accent-fg">
          <Icon name="play" size={11} /> Invoke
        </span>
      </div>
      <div className="flex items-center gap-3 px-3 pb-2 text-xs text-muted">
        <span className="text-fg">Message</span>
        <span>Metadata</span>
        <span>Tests</span>
        <span className="ml-auto rounded-sm bg-info/15 px-1.5 py-0.5 text-2xs text-info">
          Server streaming
        </span>
      </div>
      <div className="px-3 pb-3 font-mono text-xs leading-5">
        <JsonLine text='{ "orderId": "ord_7f3c" }' />
      </div>

      <div className="flex min-h-[260px] flex-1 flex-col bg-canvas/60 px-3 py-3 text-xs">
        <p className="mb-2 flex items-center gap-2">
          <span className="font-medium">Stream</span>
          <span className="text-muted tabular-nums">{count} messages</span>
        </p>
        <ol className="flex flex-col gap-1 font-mono">
          <AnimatePresence initial={false}>
            {STREAM.slice(0, count).map((status, i) => (
              <m.li
                key={status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 rounded-sm bg-panel px-2 py-1.5"
              >
                <Icon name="download" size={12} className="text-info" />
                <span className="text-muted tabular-nums">+{(i * 0.9).toFixed(1)}s</span>
                <JsonLine text={`{ "status": "${status}" }`} />
              </m.li>
            ))}
          </AnimatePresence>
        </ol>
        {complete && (
          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 flex items-center gap-2 font-sans text-success"
          >
            <Ario mood="happy" size={18} className="text-success" /> Completed · OK
          </m.p>
        )}
      </div>
    </Fragment>
  );
}

export default function Protocols() {
  return (
    <m.section id="features" {...inView} className="page py-24 lg:py-40">
      <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
        <m.h2 variants={rise} className="text-title font-semibold lg:col-span-6">
          HTTP and gRPC in one place
        </m.h2>
        <m.p variants={rise} className="text-body max-w-[56ch] lg:col-span-6 lg:pt-2">
          Every method, JSON to multipart to GraphQL bodies, bearer, basic and API-key auth. Next to
          it, gRPC from <code>.proto</code> files or server reflection: unary, server, client and
          bidirectional streaming, with no <code>protoc</code> to install.
        </m.p>
      </div>
      <div className="mt-14 grid items-stretch gap-3 lg:grid-cols-12">
        <m.div variants={rise} className="lg:col-span-5 lg:mt-16">
          <HttpSide />
        </m.div>
        <m.div variants={rise} className="lg:col-span-7">
          <GrpcSide />
        </m.div>
      </div>
    </m.section>
  );
}
