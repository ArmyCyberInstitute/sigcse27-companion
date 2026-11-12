# Bitcoin

Open `/labs/bitcoin/`. Switch between **Student console** and **Instructor console**. Each must connect to its own node and retain the exercise pager. Open **Peers**, the wallet-address pages, and the other published labs from the navigation.

1. Visit the primer, Regtest, and ClassNet tabs. Check chapter selection, previous/next controls, copied commands, expected observations.
2. Follow Regtest setup in the student console: start the private node, create wallets, mine mature coins, transfer funds, and inspect the transaction. Shut down that private node using the guide.
3. On the shared ClassNet chain, publish an address from the student station. Send a transaction from the instructor station to it, mine a confirming block, and confirm the receiver's balance.
4. Find that transaction in **Mempool** and **Explorer**. Check its inputs, outputs, block hash, and confirmation state. Verify that all pages and assets stay under their deployment prefixes.
5. Resize the console, hide/show it, and open its popout. Run `pwd` through the browser terminal and record the visible result.

6. After confirming a new transfer, select **Sync graph** on the console. Confirm that progress is visible, repeat requests share the running job, and the final indexed height includes that transfer. Open the transaction in Chain Graph.

The automated workflow mines and transfers coins through the actual ttyd WebSocket, checks the receiving balance, then checks the indexed transaction and graph. The classroom initializer funds the shared network without generating assessment evidence.

## Zellij terminal review

On each station, confirm `$ZELLIJ_SESSION_NAME` is `bitcoin`. Create a pane with `Alt+n`, run a command there, and navigate back with `Alt+Left`. Create a tab with `Ctrl+G`, `t`, `n`; inspect it, then return with `Ctrl+G`, `t`, `Left`. Normal typing must reach Bash without an extra unlock step.

Set a uniquely named shell variable, reload the console, and confirm the value remains. Repeat after **Hide Console**, **Show Console**, and **Popout**. The two stations must retain independent variables and working directories. Close only the panes and tabs created by the check.
