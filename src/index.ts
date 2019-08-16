import * as read_bin_all from "./read_bin_all";
import * as path from "path";
import * as fs from "fs";

function main(dir: string) {
    var bin_all_path = path.join(dir, "bin.all");
    var bin_all_buffer = fs.readFileSync(bin_all_path);

    var data = read_bin_all.read_bin_all(bin_all_buffer);
    console.log(data);
}

main("data");