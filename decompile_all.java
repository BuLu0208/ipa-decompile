// @category Decompile
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;

public class decompile_all extends GhidraScript {

    @Override
    public void run() throws Exception {
        String outputDir = getScriptArgs()[0];
        File dir = new File(outputDir);
        if (!dir.exists()) dir.mkdirs();

        DecompInterface decomp = new DecompInterface();
        decomp.openProgram(currentProgram);

        File outFile = new File(dir, currentProgram.getName() + "_decompiled.c");
        PrintWriter pw = new PrintWriter(new FileWriter(outFile));
        pw.println("// Program: " + currentProgram.getName());

        FunctionIterator functions = currentProgram.getFunctionManager().getFunctions(true);
        int total = 0, success = 0;

        while (functions.hasNext() && !monitor.isCancelled()) {
            Function func = functions.next();
            total++;
            try {
                DecompileResults results = decomp.decompileFunction(func, 120, monitor);
                if (results != null && results.decompileCompleted()) {
                    String code = results.getDecompiledFunction().getC();
                    if (code != null && code.length() > 20) {
                        pw.println("// === " + func.getName() + " @ " + func.getEntryPoint() + " ===");
                        pw.println(code);
                        pw.println();
                        success++;
                    }
                }
            } catch (Exception e) { }
            if (total % 200 == 0) println("Progress: " + total);
        }
        pw.close();
        decomp.dispose();
        println("DONE: " + success + "/" + total + " functions -> " + outFile);
    }
}
