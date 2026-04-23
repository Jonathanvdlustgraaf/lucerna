export interface Command {
    id: string;
    label: string;
    description: string;
    shortcut?: string;
    icon?: string;
    handler: () => void;
}

const commands: Command[] = [];

export function registerCommand(command: Command): () => void {
    commands.push(command);
    return () => {
        const i = commands.indexOf(command);
        if (i >= 0) commands.splice(i, 1);
    };
}

export function searchCommands(query: string): Command[] {
    if (!query) return commands.slice(0, 10);
    const q = query.toLowerCase();
    return commands
        .filter((cmd) => {
            let qi = 0;
            for (const ch of cmd.label.toLowerCase()) {
                if (qi < q.length && ch === q[qi]) qi++;
            }
            return qi === q.length;
        })
        .slice(0, 10);
}

export function getAllCommands(): readonly Command[] {
    return commands;
}

export function clearCommands(): void {
    commands.splice(0, commands.length);
}
